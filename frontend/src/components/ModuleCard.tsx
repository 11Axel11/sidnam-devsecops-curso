import type { ModuleCardProps } from "@/types/moduleCard";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/card";

const ModuleCard = ({
  moduleName,
  moduleDescription,
  moduleIcon: Icon,
  action,
}: ModuleCardProps) => {
  return (
    <div onClick={action} className="flex">
      <Card className="hover:cursor-pointer w-xl">
        <CardHeader className="hover:cursor-pointer flex flex-col items-center gap-4">
          
          <div className="flex gap-4 items-center justify-between">
            <Icon size={30} className="text-primary" />
            <CardTitle className="hover:cursor-pointer">{moduleName}</CardTitle>
          </div>
          <CardDescription className="text-justify hover:cursor-pointer">
              {moduleDescription}
            </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default ModuleCard;
