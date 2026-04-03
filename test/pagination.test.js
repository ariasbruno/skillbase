import assert from 'node:assert';

/**
 * Lógica de paginación que queremos implementar.
 * Mantiene el cursor visible dentro de una ventana de tamaño `pageSize`.
 */
function calculateOffset(cursor, currentOffset, pageSize, totalItems) {
  if (totalItems <= pageSize) return 0;
  
  if (cursor < currentOffset) {
    return cursor;
  }
  
  if (cursor >= currentOffset + pageSize) {
    return cursor - pageSize + 1;
  }
  
  return currentOffset;
}

// Pruebas TDD
try {
  // Caso 1: Lista pequeña (sin desplazamiento)
  assert.strictEqual(calculateOffset(0, 0, 10, 5), 0, 'Cursor 0 en lista pequeña debe tener offset 0');
  assert.strictEqual(calculateOffset(4, 0, 10, 5), 0, 'Cursor final en lista pequeña debe tener offset 0');

  // Caso 2: Bajando (scroll hacia abajo)
  assert.strictEqual(calculateOffset(9, 0, 10, 50), 0, 'Cursor 9 en página de 10 debe tener offset 0');
  assert.strictEqual(calculateOffset(10, 0, 10, 50), 1, 'Cursor 10 en página de 10 debe forzar offset 1');
  assert.strictEqual(calculateOffset(15, 6, 10, 50), 6, 'Cursor 15 con offset 6 (dentro del rango) debe mantener offset 6');
  assert.strictEqual(calculateOffset(20, 6, 10, 50), 11, 'Cursor 20 con offset 6 debe forzar offset 11');

  // Caso 3: Subiendo (scroll hacia arriba)
  assert.strictEqual(calculateOffset(5, 6, 10, 50), 5, 'Cursor 5 con offset 6 debe forzar offset 5');
  assert.strictEqual(calculateOffset(0, 5, 10, 50), 0, 'Cursor 0 con offset 5 debe forzar offset 0');

  console.log('✅ Todas las pruebas de paginación pasaron.');
} catch (error) {
  console.error('❌ Fallo en pruebas de paginación:');
  console.error(error.message);
  process.exit(1);
}
