import { Link } from "@tanstack/react-router";
import { Card } from "../ui/card";
import type { configCardProps } from "@/types/adjItem";

const AjustesItem = ({
  configIcon: Icon,
  configName,
  DialogComponent,
  url,
}: configCardProps & { DialogComponent?: React.FC; url?: string }) => {
  if (DialogComponent) return <DialogComponent />;

  // Mismo aspecto que los disparadores de los diálogos (p. ej. FormAgregarPatologia).
  const card = (
    <Card className="flex hover:cursor-pointer items-center gap-2">
      <Icon /> {configName}
    </Card>
  );

  // `url` llega como string desde la configuración de Ajustes, por eso el cast.
  if (url) return <Link to={url as never} className="block text-inherit no-underline">{card}</Link>;

  return card;
};

export default AjustesItem;
