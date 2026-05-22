import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Calculator,
  head: () => ({
    meta: [
      { title: "Calculator" },
      { name: "description", content: "A simple, elegant calculator." },
    ],
  }),
});

type Op = "+" | "-" | "×" | "÷";

function Calculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [overwrite, setOverwrite] = useState(true);

  const inputDigit = (d: string) => {
    if (overwrite) {
      setDisplay(d === "." ? "0." : d);
      setOverwrite(false);
    } else {
      if (d === "." && display.includes(".")) return;
      setDisplay(display.length >= 12 ? display : display + d);
    }
  };

  const compute = (a: number, b: number, o: Op) => {
    switch (o) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
    }
  };

  const fmt = (n: number) => {
    if (!isFinite(n)) return "Error";
    const s = parseFloat(n.toPrecision(12)).toString();
    return s.length > 12 ? n.toExponential(6) : s;
  };

  const chooseOp = (next: Op) => {
    const curr = parseFloat(display);
    if (prev !== null && op && !overwrite) {
      const r = compute(prev, curr, op);
      setPrev(r);
      setDisplay(fmt(r));
    } else {
      setPrev(curr);
    }
    setOp(next);
    setOverwrite(true);
  };

  const equals = () => {
    if (prev === null || op === null) return;
    const r = compute(prev, parseFloat(display), op);
    setDisplay(fmt(r));
    setPrev(null);
    setOp(null);
    setOverwrite(true);
  };

  const clear = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setOverwrite(true);
  };

  const toggleSign = () => setDisplay(d => (d.startsWith("-") ? d.slice(1) : d === "0" ? d : "-" + d));
  const percent = () => setDisplay(d => fmt(parseFloat(d) / 100));

  const Btn = ({ onClick, children, variant = "num", wide = false }: {
    onClick: () => void; children: React.ReactNode; variant?: "num" | "fn" | "op"; wide?: boolean;
  }) => {
    const base = "h-20 rounded-2xl text-2xl font-medium transition-all active:scale-95 shadow-sm";
    const styles = {
      num: "bg-card text-card-foreground hover:bg-accent",
      fn: "bg-muted text-muted-foreground hover:bg-muted/70",
      op: "bg-primary text-primary-foreground hover:bg-primary/90",
    };
    return (
      <button onClick={onClick} className={`${base} ${styles[variant]} ${wide ? "col-span-2" : ""}`}>
        {children}
      </button>
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <h1 className="sr-only">Calculator</h1>
        <div className="mb-4 rounded-3xl bg-card p-6 shadow-lg border">
          <div className="min-h-[3rem] text-right text-sm text-muted-foreground tabular-nums">
            {prev !== null && op ? `${fmt(prev)} ${op}` : "\u00A0"}
          </div>
          <div className="text-right text-5xl font-light text-foreground tabular-nums truncate">
            {display}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Btn variant="fn" onClick={clear}>AC</Btn>
          <Btn variant="fn" onClick={toggleSign}>+/−</Btn>
          <Btn variant="fn" onClick={percent}>%</Btn>
          <Btn variant="op" onClick={() => chooseOp("÷")}>÷</Btn>

          <Btn onClick={() => inputDigit("7")}>7</Btn>
          <Btn onClick={() => inputDigit("8")}>8</Btn>
          <Btn onClick={() => inputDigit("9")}>9</Btn>
          <Btn variant="op" onClick={() => chooseOp("×")}>×</Btn>

          <Btn onClick={() => inputDigit("4")}>4</Btn>
          <Btn onClick={() => inputDigit("5")}>5</Btn>
          <Btn onClick={() => inputDigit("6")}>6</Btn>
          <Btn variant="op" onClick={() => chooseOp("-")}>−</Btn>

          <Btn onClick={() => inputDigit("1")}>1</Btn>
          <Btn onClick={() => inputDigit("2")}>2</Btn>
          <Btn onClick={() => inputDigit("3")}>3</Btn>
          <Btn variant="op" onClick={() => chooseOp("+")}>+</Btn>

          <Btn onClick={() => inputDigit("0")} wide>0</Btn>
          <Btn onClick={() => inputDigit(".")}>.</Btn>
          <Btn variant="op" onClick={equals}>=</Btn>
        </div>
      </div>
    </main>
  );
}
