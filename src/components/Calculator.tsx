import { useState } from 'react';
import { Button } from '@/components/ui/button';

const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(`${parseFloat(newValue.toFixed(7))}`);
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      performOperation('=');
      setOperation(null);
      setPreviousValue(null);
      setWaitingForOperand(true);
    }
  };

  const ButtonGrid = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`grid grid-cols-4 gap-2 ${className}`}>
      {children}
    </div>
  );

  const CalcButton = ({ 
    onClick, 
    children, 
    variant = 'number',
    className = '',
    span = 1 
  }: { 
    onClick: () => void; 
    children: React.ReactNode; 
    variant?: 'number' | 'operator' | 'equals' | 'clear';
    className?: string;
    span?: number;
  }) => {
    const baseClasses = "h-16 text-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95";
    
    const variantClasses = {
      number: "bg-calc-number hover:bg-calc-number/80 text-foreground",
      operator: "bg-calc-operator hover:bg-calc-operator/80 text-primary-foreground",
      equals: "bg-calc-equals hover:bg-calc-equals/80 text-foreground",
      clear: "bg-calc-clear hover:bg-calc-clear/80 text-destructive-foreground"
    };

    const spanClass = span === 2 ? 'col-span-2' : '';

    return (
      <Button
        onClick={onClick}
        className={`${baseClasses} ${variantClasses[variant]} ${spanClass} ${className}`}
        variant="ghost"
      >
        {children}
      </Button>
    );
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-card border border-border rounded-2xl p-6 shadow-2xl">
      {/* Display */}
      <div className="mb-6 p-4 bg-calc-display rounded-xl border border-border">
        <div className="text-right text-3xl font-mono text-foreground min-h-[3rem] flex items-center justify-end overflow-hidden">
          {display}
        </div>
      </div>

      {/* Button Grid */}
      <div className="space-y-2">
        {/* First Row */}
        <ButtonGrid>
          <CalcButton onClick={clear} variant="clear">C</CalcButton>
          <CalcButton onClick={() => setDisplay(display.slice(0, -1) || '0')} variant="operator">⌫</CalcButton>
          <CalcButton onClick={() => performOperation('÷')} variant="operator">÷</CalcButton>
          <CalcButton onClick={() => performOperation('×')} variant="operator">×</CalcButton>
        </ButtonGrid>

        {/* Second Row */}
        <ButtonGrid>
          <CalcButton onClick={() => inputNumber('7')} variant="number">7</CalcButton>
          <CalcButton onClick={() => inputNumber('8')} variant="number">8</CalcButton>
          <CalcButton onClick={() => inputNumber('9')} variant="number">9</CalcButton>
          <CalcButton onClick={() => performOperation('-')} variant="operator">−</CalcButton>
        </ButtonGrid>

        {/* Third Row */}
        <ButtonGrid>
          <CalcButton onClick={() => inputNumber('4')} variant="number">4</CalcButton>
          <CalcButton onClick={() => inputNumber('5')} variant="number">5</CalcButton>
          <CalcButton onClick={() => inputNumber('6')} variant="number">6</CalcButton>
          <CalcButton onClick={() => performOperation('+')} variant="operator">+</CalcButton>
        </ButtonGrid>

        {/* Fourth Row */}
        <ButtonGrid>
          <CalcButton onClick={() => inputNumber('1')} variant="number">1</CalcButton>
          <CalcButton onClick={() => inputNumber('2')} variant="number">2</CalcButton>
          <CalcButton onClick={() => inputNumber('3')} variant="number">3</CalcButton>
          <CalcButton onClick={handleEquals} variant="equals" className="row-span-2 h-[8.5rem]">
            =
          </CalcButton>
        </ButtonGrid>

        {/* Fifth Row */}
        <ButtonGrid>
          <CalcButton onClick={() => inputNumber('0')} variant="number" span={2}>0</CalcButton>
          <CalcButton onClick={inputDecimal} variant="number">.</CalcButton>
        </ButtonGrid>
      </div>
    </div>
  );
};

export default Calculator;