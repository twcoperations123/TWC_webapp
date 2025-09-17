import ProgressLink from '../components/ProgressLink';
import Logo from "../assets/TWC_Logo_Horiztonal_Black_Gold.png";

export default function ContactAdmin() {
  const adminEmail = "twcoperations123@gmail.com"; // Change this to your actual admin email

  const handleEmailClick = () => {
    const subject = "Account Password Reset Request";
    const body = `Hello Admin,

I need help with my account password reset. Please assist me with accessing my account.

Thank you,
[Your Name]`;
    
    const mailtoLink = `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="w-screen flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <header className="fixed top-0 left-0 w-screen h-20 flex items-center bg-slate-800 text-white px-5">
        <ProgressLink to="/" className="text-white hover:text-white active:text-white visited:text-white">
          <img
            src={Logo}
            alt="TWC logo"
            className="h-16 sm:h-20 md:h-24 w-auto"
          />
        </ProgressLink>
      </header>
      
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a1 1 0 001.42 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Contact Admin</h2>
          <p className="text-gray-600 mb-6">
            For password reset requests, please contact our administrator directly.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Admin Email:</p>
            <p className="text-lg font-medium text-gray-800 break-all">{adminEmail}</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleEmailClick}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a1 1 0 001.42 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Email to Admin
            </button>
            
            <ProgressLink
              to="/sign-in"
              className="block w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-center"
            >
              Back to Sign In
            </ProgressLink>
            
            <ProgressLink
              to="/"
              className="block w-full px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors text-center"
            >
              Back to Home
            </ProgressLink>
          </div>
        </div>
      </div>
    </div>
  );
}
