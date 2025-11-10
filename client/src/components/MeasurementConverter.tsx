import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const conversions: Record<string, Record<string, number>> = {
  // Volume conversions (to ml)
  tsp: { ml: 4.929, tbsp: 0.333, cup: 0.021, oz: 0.167, gal: 0.0013 },
  tbsp: { ml: 14.787, tsp: 3, cup: 0.063, oz: 0.5, gal: 0.0039 },
  cup: { ml: 236.588, tsp: 48, tbsp: 16, oz: 8, gal: 0.0625 },
  oz: { ml: 29.574, tsp: 6, tbsp: 2, cup: 0.125, gal: 0.0078 },
  gal: { ml: 3785.412, tsp: 768, tbsp: 256, cup: 16, oz: 128 },
  ml: { tsp: 0.203, tbsp: 0.068, cup: 0.004, oz: 0.034, gal: 0.0003 },
  
  // Temperature
  f: { c: (f: number) => (f - 32) * 5/9 },
  c: { f: (c: number) => c * 9/5 + 32 },
  
  // Weight conversions (to grams)
  g: { oz_wt: 0.035, lb: 0.0022, kg: 0.001 },
  kg: { g: 1000, oz_wt: 35.274, lb: 2.205 },
  oz_wt: { g: 28.35, kg: 0.028, lb: 0.0625 },
  lb: { g: 453.592, kg: 0.454, oz_wt: 16 },
};

export function MeasurementConverter() {
  const [value, setValue] = useState<string>("1");
  const [fromUnit, setFromUnit] = useState<string>("cup");
  const [toUnit, setToUnit] = useState<string>("ml");
  const [result, setResult] = useState<string>("");

  const convert = () => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      setResult("Invalid number");
      return;
    }

    if (fromUnit === toUnit) {
      setResult(num.toString());
      return;
    }

    let converted: number;
    
    if (conversions[fromUnit]?.[toUnit]) {
      const factor = conversions[fromUnit][toUnit];
      if (typeof factor === "function") {
        converted = factor(num);
      } else {
        converted = num * factor;
      }
    } else {
      setResult("Conversion not supported");
      return;
    }

    setResult(converted.toFixed(2));
  };

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setResult("");
  };

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-serif text-lg font-semibold">Measurement Converter</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="value" className="text-sm font-medium mb-2 block">
            Value
          </Label>
          <Input
            id="value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="1"
            data-testid="input-converter-value"
          />
        </div>
        
        <div>
          <Label htmlFor="from-unit" className="text-sm font-medium mb-2 block">
            From
          </Label>
          <Select value={fromUnit} onValueChange={setFromUnit}>
            <SelectTrigger id="from-unit" data-testid="select-from-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tsp">Teaspoon</SelectItem>
              <SelectItem value="tbsp">Tablespoon</SelectItem>
              <SelectItem value="cup">Cup</SelectItem>
              <SelectItem value="oz">Fluid Ounce</SelectItem>
              <SelectItem value="gal">Gallon</SelectItem>
              <SelectItem value="ml">Milliliter</SelectItem>
              <SelectItem value="g">Gram</SelectItem>
              <SelectItem value="kg">Kilogram</SelectItem>
              <SelectItem value="oz_wt">Ounce (weight)</SelectItem>
              <SelectItem value="lb">Pound</SelectItem>
              <SelectItem value="c">Celsius</SelectItem>
              <SelectItem value="f">Fahrenheit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="icon"
          onClick={swap}
          data-testid="button-swap-units"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </Button>
      </div>
      
      <div>
        <Label htmlFor="to-unit" className="text-sm font-medium mb-2 block">
          To
        </Label>
        <Select value={toUnit} onValueChange={setToUnit}>
          <SelectTrigger id="to-unit" data-testid="select-to-unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tsp">Teaspoon</SelectItem>
            <SelectItem value="tbsp">Tablespoon</SelectItem>
            <SelectItem value="cup">Cup</SelectItem>
            <SelectItem value="oz">Fluid Ounce</SelectItem>
            <SelectItem value="gal">Gallon</SelectItem>
            <SelectItem value="ml">Milliliter</SelectItem>
            <SelectItem value="g">Gram</SelectItem>
            <SelectItem value="kg">Kilogram</SelectItem>
            <SelectItem value="oz_wt">Ounce (weight)</SelectItem>
            <SelectItem value="lb">Pound</SelectItem>
            <SelectItem value="c">Celsius</SelectItem>
            <SelectItem value="f">Fahrenheit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button onClick={convert} className="w-full" data-testid="button-convert">
        Convert
      </Button>
      
      {result && (
        <div className="p-4 bg-primary/10 rounded-md text-center">
          <p className="text-sm text-muted-foreground">Result</p>
          <p className="text-2xl font-bold text-primary" data-testid="text-conversion-result">
            {result}
          </p>
        </div>
      )}
    </Card>
  );
}
