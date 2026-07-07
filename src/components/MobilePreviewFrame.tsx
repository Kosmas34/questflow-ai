// A phone-shaped frame used to preview the guest chat inside the
// dashboard. Presentational only — no chat logic.
export default function MobilePreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="relative rounded-[2.25rem] border-[6px] border-sea bg-sea p-1.5 shadow-lift">
        {/* speaker notch */}
        <div className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-shore/20" />
        <div className="h-[540px] overflow-hidden rounded-[1.85rem] bg-shore">
          {children}
        </div>
      </div>
    </div>
  );
}
