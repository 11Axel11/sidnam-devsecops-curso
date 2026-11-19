import { Injectable } from '@nestjs/common';
import { CategoriasOptions } from 'src/common/enums/categoriasPrincipalesProductos.enum';
import { SedeEnum } from 'src/common/enums/sede.enum';

// A.1.7 (RF-IN-04): GET /inventario/categorias?sede=
//
// Reutiliza el mismo catálogo de InventarioService.getCategorias() (el
// enum CategoriasPrincipalesProductos: Alimentos/Limpieza/Medicamentos) en
// vez de inventar un esquema de categorías paralelo — es lo único que
// existe hoy en el backend para categorías de inventario.
//
// NOTA: en el esquema actual las categorías NO están ligadas a una sede
// (no hay ninguna tabla/columna que relacione `producto.categoriaTipo` con
// `sede`) — la categoría de un producto es la misma sin importar en qué
// sede tenga existencia. Por eso `sede` se recibe (para que el endpoint
// tenga la misma forma que el resto del módulo) pero no filtra nada por
// ahora. No se encontró en este repo el `catPrefix` hardcodeado del
// frontend que menciona la tarea — si existe un criterio de categorías
// específico para CECUIDAM que no esté modelado en el backend todavía,
// hace falta que alguien con acceso al frontend lo confirme.
@Injectable()
export class ListarCategoriasSedeUseCase {
  listar(_sede?: SedeEnum) {
    return CategoriasOptions.map((opt) => ({
      id: opt.id,
      nombre: opt.nombre,
    }));
  }
}
