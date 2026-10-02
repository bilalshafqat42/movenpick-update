import localFont from "next/font/local";
import { Gloock, Noto_Sans } from "next/font/google";

export const inter = localFont({
  src: "../fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const kinan = localFont({
  src: "../fonts/Kinan.ttf",
  variable: "--font-kinan",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const minervaModern = localFont({
  src: "../fonts/minerva-modern.otf",
  variable: "--font-minerva-modern",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const gloock = Gloock({
  variable: "--font-gloock",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});
