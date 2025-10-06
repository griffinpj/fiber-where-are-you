export function Footer() {
  return (
    <footer className="border-t bg-muted/50 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>Washington State Only:</strong> This app currently supports fiber provider searches in Washington State only.
          </p>
          <p>
            Data sourced from FCC Form 477 broadband availability reports • 
            Built with Next.js and powered by US Census Bureau geocoding
          </p>
        </div>
      </div>
    </footer>
  );
}