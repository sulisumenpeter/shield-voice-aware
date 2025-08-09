import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useMockSession } from "@/hooks/useMockSession";
import { Button } from "@/components/ui/button";

interface RiskWidgetProps {
  autoplay?: boolean;
}

export const RiskWidget = ({ autoplay = false }: RiskWidgetProps) => {
  const { connected, isSpeaking, risk, language, items, start, stop } = useMockSession("en");

  useEffect(() => {
    if (autoplay) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  const latest = items[0];
  const color = risk >= 70 ? "destructive" : risk >= 35 ? "secondary" : "primary";

  return (
    <div className="z-50 md:fixed md:bottom-4 md:left-4 md:right-4 sticky bottom-2 w-full px-4">
      <Card className={cn("shadow-lg border p-3 w-full max-w-sm md:ml-auto bg-card/90 backdrop-blur", "surface-glow")}> 
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2.5 w-2.5 rounded-full",
              isSpeaking ? "bg-primary animate-pulse" : "bg-muted"
            )} />
            <span className="text-xs text-muted-foreground">{connected ? "Monitoring" : "Idle"} • {language.toUpperCase()}</span>
          </div>
          <Badge variant={color as any}>{Math.round(risk)}%</Badge>
        </div>

        <div className="mt-2">
          {latest ? (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{latest.speaker}</span>
                <Badge
                  variant={latest.label === "Scam" ? "destructive" : latest.label === "Suspicious" ? "secondary" : "outline"}
                >
                  {latest.label}
                </Badge>
              </div>
              <p className="text-xs mt-1 leading-snug">{latest.text}</p>
              <p className="text-[11px] mt-1 text-muted-foreground">{latest.rationale}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No transcript yet.</p>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          {!connected ? (
            <Button size="sm" onClick={start}>Start Mock</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={stop}>Stop</Button>
          )}
          <a className="text-xs underline text-muted-foreground ml-auto" href="/dashboard">Open dashboard</a>
        </div>
      </Card>
    </div>
  );
};

export default RiskWidget;
