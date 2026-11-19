import { useNavigate } from "@tanstack/react-router";
import { logout } from "@/hooks/useAuth";

const ButtonLogout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout(() => navigate({ to: "/login", replace: true }));
  };

  return (
    <button onClick={handleLogout} className="hover:cursor-pointer">
      Cerrar sesión
    </button>
  );
};

export default ButtonLogout;
