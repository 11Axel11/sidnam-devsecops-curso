import {
  ChevronRight,
  ChevronUp,
  LogOut,
  User2,
  UserPen,
  UserRoundCog,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAuth, useAuthz } from "@/hooks/useAuth";
import { sidebarItems as items } from "./sidebar-items";
import ButtonLogout from "../auth/ButtonLogout";
import IfPerm from "../auth/IfPerm";

export function AppSidebar() {
  const { name } = useAuth();
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
  const { isLoading: loadingPerms, can, canAny } = useAuthz();

  const handleOpenChange = (title: string, value: boolean) => {
    setOpenStates((prev) => ({ ...prev, [title]: value }));
  };

  const filteredItems = useMemo(() => {
    if (loadingPerms) return [];

    return (
      items
        .map((item) => {
          const visibleChildren = (item.children ?? []).filter((sub) =>
            sub.perms ? sub.perms.every(can) : sub.anyOf ? canAny(sub.anyOf) : true
          );

          const parentVisible =
            item.perms ? item.perms.every(can) : item.anyOf ? canAny(item.anyOf) : true;

          if (!parentVisible && visibleChildren.length === 0) return null;
          return {
            ...item,
            children: visibleChildren.length > 0 ? visibleChildren : undefined,
          };
        })
        .filter(Boolean) as typeof items
    );
  }, [loadingPerms, can, canAny]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Bienvenido a SIDNAM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="justify-start ">
              {filteredItems.map((item) =>
                item.children?.length ? ( 
                  <Collapsible
                    key={item.title}
                    open={openStates[item.title]}
                    onOpenChange={(value) => handleOpenChange(item.title, value)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="hover:cursor-pointer flex justify-start gap-2 items-center">
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronRight
                            className={`ml-auto transition-transform duration-300 ${openStates[item.title] ? "rotate-90" : "rotate-0"
                              }`}
                            size={18}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </SidebarMenuItem>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children.map((subitem) => {
                          return (
                            <SidebarMenuSubItem
                              key={subitem.title}
                              className="pl-4 flex gap-2 w-full hover:bg-muted rounded-sm"
                            >
                              <subitem.icon className="w-4" />
                              <Link
                                to={subitem.url!}
                                className="hover:cursor-pointer flex items-center w-full justify-start gap-2 relative"
                              >
                                <span>{subitem.title}</span>
                              </Link>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.url!}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> {name}
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem className="hover:cursor-pointer">
                  <Link to="/perfil" className="w-full [&.active]:font-medium flex gap-2">
                    <UserPen />
                    Perfil
                  </Link>
                </DropdownMenuItem>

                <IfPerm perm="Seguridad.Usuarios:Ver">
                  <DropdownMenuItem>
                    <Link to="/usuarios" className="w-full [&.active]:font-medium flex gap-2">
                      <UserRoundCog />
                      Gestionar usuarios
                    </Link>
                  </DropdownMenuItem>
                </IfPerm>
                
                <DropdownMenuItem className="w-full hover:cursor-pointer flex gap-2">
                  <LogOut />
                  <ButtonLogout />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
