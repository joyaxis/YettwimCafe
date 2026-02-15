import "./globals.css";

export const metadata = {
  title: "Cafe Order",
  description: "카페 메뉴 주문",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen bg-white">
          {children}
        </div>
      </body>
    </html>
  );
}
