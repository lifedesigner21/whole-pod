import Calculator from '@/components/Calculator';

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-foreground">Calculator</h1>
          <p className="text-lg text-muted-foreground">A modern calculator application</p>
        </div>
        <Calculator />
      </div>
    </div>
  );
};

export default Index;
