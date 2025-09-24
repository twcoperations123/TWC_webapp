// src/pages/Landing.tsx
import Logo from "../assets/TWC_Logo_Horiztonal_White.png";
import VerticalLogo from "../assets/TWC_Logo_Vertical_White.png";
import ProgressLink from "../components/ProgressLink";

export default function Landing() {
  return (
    <>
      {/* HERO SECTION */}
      <section className="relative w-full">
        {/* Full image (no cropping) */}
        <img
          src="/cocktails.webp"
          alt="Cocktails background"
          className="block w-full h-auto select-none pointer-events-none"
        />
        <header
          className="
            absolute top-0 left-0 w-full h-16 sm:h-20 md:h-24
            flex items-center justify-between
            px-4 sm:px-6
            z-10
          "
        >
          <h1 className="flex items-center gap-3 flex-1 mr-4 text-black">
            {/* If you want the text, keep it; otherwise remove this span */}
            <span className="block sm:hidden text-lg font-extrabold tracking-tight">
              Cocktails
            </span>
            <img
              src={Logo}
              alt="TWC logo"
              className="h-14 sm:h-16 md:h-20 lg:h-24 xl:h-28 w-auto"
            />
          </h1>

          <ProgressLink
            to="/sign-in"
            className="
              rounded-full border border-white bg-white
              px-4 py-2 sm:px-6 sm:py-2 text-sm sm:text-lg font-medium
              text-black hover:bg-white hover:text-black transition
              whitespace-nowrap flex-shrink-0
              min-h-[44px] flex items-center justify-center
            "
          >
            Sign&nbsp;In
          </ProgressLink>
        </header>

  {/* Optional: bottom gradient overlay for readability without hiding full image */}
  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 via-black/25 to-transparent" />

        {/* Bottom-aligned hero copy + footer stacked vertically */}
        <div className="absolute inset-0 flex flex-col justify-end items-center gap-6 pb-14 px-6">
          <div className="w-full max-w-3xl mx-auto text-white">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              Premium Cocktail Delivery Service
            </h2>
            <p className="mt-3 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              Order from our curated selection of premium cocktails and alcoholic beverages. Fresh
              ingredients, expertly crafted, delivered to your door.
            </p>
          </div>
          {/* Footer logo + contact info at page bottom (centered, stacked) */}
          <div className="w-full max-w-md mx-auto mt-2 text-center text-white/95">
            <img
              src={VerticalLogo}
              alt="TWC vertical logo"
              className="mx-auto h-24 sm:h-28 md:h-32 lg:h-36 xl:h-40 w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
            />
            <div className="mt-3 text-xs sm:text-sm md:text-base lg:text-lg font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              <p>312-204-7222</p>
              <p>info@twccocktail.com</p>
              <p>@twccocktailcollective</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
