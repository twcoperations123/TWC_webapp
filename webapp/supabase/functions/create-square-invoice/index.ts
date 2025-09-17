import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

interface CreateInvoiceRequest {
  cartItems: CartItem[];
  totalWithTax: number;
  deliveryTime?: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request data
    const { cartItems, totalWithTax, deliveryTime, userId }: CreateInvoiceRequest = await req.json()

    // Validate required fields
    if (!cartItems || !totalWithTax || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: cartItems, totalWithTax, userId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Square configuration from environment
    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const squareLocationId = Deno.env.get('SQUARE_LOCATION_ID')
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox'

    if (!squareAccessToken || !squareLocationId) {
      console.error('Missing Square configuration')
      return new Response(
        JSON.stringify({ error: 'Square payment configuration not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const baseUrl = squareEnvironment === 'sandbox' 
      ? 'https://connect.squareupsandbox.com' 
      : 'https://connect.squareup.com'

    // Generate order number
    const orderNumber = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Convert cart items to Square line items
    const lineItems = cartItems.map(item => ({
      name: item.name,
      quantity: item.quantity.toString(),
      itemType: 'ITEM',
      basePriceMoney: {
        amount: Math.round(item.price * 100), // Convert to cents
        currency: 'USD'
      },
      variationName: item.specialInstructions ? 'Custom' : undefined,
      note: item.specialInstructions || undefined
    }))

    // Add tax as separate line item
    const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const taxAmount = totalWithTax - cartSubtotal
    
    if (taxAmount > 0) {
      lineItems.push({
        name: 'Tax (8.25%)',
        quantity: '1',
        itemType: 'CUSTOM_AMOUNT',
        basePriceMoney: {
          amount: Math.round(taxAmount * 100),
          currency: 'USD'
        }
      })
    }

    // Create Square invoice request
    const invoiceRequest = {
      locationIds: [squareLocationId],
      orderRequest: {
        order: {
          locationId: squareLocationId,
          lineItems
        }
      },
      primaryRecipient: {
        customerId: undefined // Anonymous customer
      },
      paymentRequests: [
        {
          requestMethod: 'EMAIL',
          requestType: 'BALANCE'
        }
      ],
      deliveryMethod: 'SHARE_MANUALLY',
      invoiceNumber: orderNumber,
      title: `Restaurant Order - ${orderNumber}`,
      description: deliveryTime 
        ? `Order for delivery at ${deliveryTime}` 
        : 'Restaurant order payment',
      acceptedPaymentMethods: {
        card: true,
        squareGiftCard: false,
        bankAccount: false,
        buyNowPayLater: false,
        cashAppPay: true
      }
    }

    console.log('Creating Square invoice:', JSON.stringify(invoiceRequest, null, 2))

    // Create invoice
    const createResponse = await fetch(`${baseUrl}/v2/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-09-19'
      },
      body: JSON.stringify(invoiceRequest)
    })

    const createResult = await createResponse.json()

    if (!createResponse.ok || createResult.errors) {
      console.error('Square invoice creation failed:', createResult)
      return new Response(
        JSON.stringify({ 
          error: createResult.errors?.[0]?.detail || `Square API error: ${createResponse.status}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!createResult.invoice) {
      return new Response(
        JSON.stringify({ error: 'No invoice returned from Square API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Publish the invoice
    const publishResponse = await fetch(`${baseUrl}/v2/invoices/${createResult.invoice.id}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-09-19'
      },
      body: JSON.stringify({
        requestMethod: 'SHARE_MANUALLY',
        version: createResult.invoice.version
      })
    })

    const publishResult = await publishResponse.json()

    if (!publishResponse.ok || publishResult.errors) {
      console.error('Square invoice publish failed:', publishResult)
      return new Response(
        JSON.stringify({ 
          error: publishResult.errors?.[0]?.detail || `Square publish error: ${publishResponse.status}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!publishResult.invoice?.publicUrl) {
      return new Response(
        JSON.stringify({ error: 'No public URL returned after publishing invoice' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Save order to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions
        })),
        total: totalWithTax,
        delivery_time: deliveryTime,
        payment_method: 'Square - Invoice',
        square_invoice_id: createResult.invoice.id,
        order_number: orderNumber,
        status: 'pending_payment',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (orderError) {
      console.error('Database error saving order:', orderError)
      // Don't fail the whole request if order saving fails
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: createResult.invoice.id,
        publicUrl: publishResult.invoice.publicUrl,
        orderNumber: orderNumber,
        orderId: orderData?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-square-invoice function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
