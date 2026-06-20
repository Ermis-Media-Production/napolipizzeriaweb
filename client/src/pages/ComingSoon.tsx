import { useEffect, useState } from "react";

export default function ComingSoon() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Target: July 1, 2026
  const TARGET = new Date("2026-07-01T10:00:00-07:00").getTime();

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, TARGET - now);
      setTime({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a0a00 0%, #3d1200 40%, #1a0a00 100%)",
      }}
    >
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #c8a96e 0, #c8a96e 1px, transparent 0, transparent 50%)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Decorative top/bottom borders */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "#c8a96e" }} />
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "#c8a96e" }} />

      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Logo / Brand */}
        <div className="mb-8">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663690084073/jtMmVctTZtvXwZEV.png"
            alt="Napoli Pizzeria"
            className="w-24 h-24 mx-auto mb-4 rounded-full shadow-2xl"
            style={{ border: "3px solid #c8a96e" }}
          />
          <h1
            className="text-5xl md:text-6xl font-bold mb-1"
            style={{ fontFamily: "'Playfair Display', serif", color: "#c8a96e" }}
          >
            Napoli Pizzeria
          </h1>
          <p className="text-lg tracking-widest uppercase" style={{ color: "#f5e6c8", letterSpacing: "0.3em" }}>
            North Las Vegas
          </p>
        </div>

        {/* Coming Soon headline */}
        <div className="mb-10">
          <h2
            className="text-3xl md:text-4xl font-semibold mb-3"
            style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff" }}
          >
            Something Delicious is Coming
          </h2>
          <p className="text-base md:text-lg" style={{ color: "#d4b896" }}>
            We're putting the finishing touches on our new online experience.
            <br />
            Stay tuned — great pizza is worth the wait!
          </p>
        </div>

        {/* Countdown */}
        <div className="flex justify-center gap-4 md:gap-8 mb-12">
          {[
            { label: "Days", value: time.days },
            { label: "Hours", value: time.hours },
            { label: "Minutes", value: time.minutes },
            { label: "Seconds", value: time.seconds },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center">
              <div
                className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-lg text-2xl md:text-3xl font-bold shadow-lg"
                style={{
                  background: "rgba(200, 169, 110, 0.15)",
                  border: "1px solid rgba(200, 169, 110, 0.4)",
                  color: "#c8a96e",
                  fontFamily: "'Oswald', sans-serif",
                }}
              >
                {pad(value)}
              </div>
              <span className="mt-2 text-xs uppercase tracking-widest" style={{ color: "#a08060" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div
          className="rounded-xl px-8 py-5 mb-8 inline-block"
          style={{
            background: "rgba(200, 169, 110, 0.1)",
            border: "1px solid rgba(200, 169, 110, 0.3)",
          }}
        >
          <p className="text-sm mb-1" style={{ color: "#d4b896" }}>
            In the meantime, give us a call or visit us:
          </p>
          <p className="text-lg font-semibold" style={{ color: "#c8a96e" }}>
            📞{" "}
            <a href="tel:7252040379" style={{ color: "#c8a96e" }}>
              725-204-0379
            </a>
          </p>
          <p className="text-sm mt-1" style={{ color: "#a08060" }}>
            3131 W. Craig Rd., North Las Vegas, NV 89032
          </p>
          <p className="text-sm" style={{ color: "#a08060" }}>
            Every Day: 10:00AM – 10:00PM
          </p>
        </div>

        {/* Social links */}
        <div className="flex justify-center gap-6">
          <a
            href="https://www.facebook.com/napolipizzerialv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm uppercase tracking-wider transition-colors duration-200"
            style={{ color: "#a08060" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#c8a96e")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#a08060")}
          >
            Facebook
          </a>
          <span style={{ color: "#a08060" }}>·</span>
          <a
            href="https://www.instagram.com/napolipizzerialv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm uppercase tracking-wider transition-colors duration-200"
            style={{ color: "#a08060" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#c8a96e")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#a08060")}
          >
            Instagram
          </a>
        </div>
      </div>
    </div>
  );
}
