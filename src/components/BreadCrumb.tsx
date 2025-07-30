// components/Breadcrumb.tsx
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BreadcrumbProps {
  paths: { name: string; to?: string }[];
}

const Breadcrumb = ({ paths }: BreadcrumbProps) => {
  const navigate = useNavigate();

  return (
    <div className="text-sm text-gray-500 mb-4 flex items-center flex-wrap">
      {paths.map((path, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />}
          {path.to ? (
            <span
              onClick={() => navigate(path.to!)}
              className="hover:underline cursor-pointer text-blue-600 uppercase"
            >
              {path.name}
            </span>
          ) : (
            <span className="font-medium text-gray-800 uppercase">{path.name}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default Breadcrumb;
