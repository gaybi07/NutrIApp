/** Niveles de la cuenta profesional (cupos de pacientes y precio mensual en pesos). Los cobros están maquetados todavía. */
export const PROFESSIONAL_LEVELS: { nivel: number; pacientes: number; precio: number }[] = [
  { nivel: 1, pacientes: 5, precio: 20000 },
  { nivel: 2, pacientes: 10, precio: 30000 },
  { nivel: 3, pacientes: 20, precio: 40000 },
];

/** El Plus suma lo mismo sobre cualquier nivel. */
export const PLUS_EXTRA = 5000;
