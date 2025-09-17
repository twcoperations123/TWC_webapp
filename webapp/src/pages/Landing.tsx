// src/pages/Landing.tsx
import Logo from "../assets/TWC_Logo_Horiztonal_White.png";
import ProgressLink from "../components/ProgressLink";

export default function Landing() {
  return (
    <>
      {/* HERO SECTION */}
      <section
        className="
          relative w-full h-screen
          bg-[url('/cocktails.webp')] bg-cover bg-center bg-no-repeat
        "
      >
        <header
          className="
            absolute top-0 left-0 w-full h-16 sm:h-20 md:25
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
              className="h-16 sm:h-20 md:h-24 w-auto"
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

        {/* Optional: a dark gradient overlay to make content readable */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Bottom padding space if you add hero text later */}
        <div className="absolute inset-0 flex items-end pb-14 px-6 pointer-events-none" />
      </section>

      {/* CONTENT SECTION */}
      <section className="bg-white py-16 sm:py-24 md:py-32 lg:py-40 px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 text-center">
          Premium Cocktail Delivery Service
        </h2>

        <p className="mt-4 text-sm sm:text-base text-slate-700 text-center max-w-2xl mx-auto leading-relaxed">
          Order from our curated selection of premium cocktails and alcoholic beverages.
          Fresh ingredients, expertly crafted, delivered to your door.
        </p>
      </section>
    </>
  );
}
