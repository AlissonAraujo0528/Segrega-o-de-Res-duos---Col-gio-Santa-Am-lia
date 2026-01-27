import * as XLSX from 'xlsx'

/**
 * Converte um array de objetos em um arquivo Excel (XLSX) e inicia o download.
 * @param data O array de dados a ser exportado.
 * @param fileName O nome do arquivo.
 * @param sheetName O nome da aba da planilha (opcional).
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[], 
  fileName: string, 
  sheetName: string = 'Dados'
): void {
  // 1. Validação de Segurança
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('Exportação cancelada: Nenhum dado fornecido ou formato inválido.')
    return
  }

  try {
    // 2. Sanitização dos Dados (Remove Proxies do Vue)
    const safeData = JSON.parse(JSON.stringify(data))

    // 3. Converte JSON para Sheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(safeData)

    // 4. Lógica de Auto-Width (Largura das Colunas)
    // Definimos explicitamente que as chaves são Strings
    const allKeys = Array.from(new Set(safeData.flatMap((item: any) => Object.keys(item)))) as string[]

    const colWidths = allKeys.map((key: string) => {
      let maxLength = key.length 

      // Pegamos uma amostra das primeiras 100 linhas para calcular a largura
      const sampleRows = safeData.slice(0, 100)
      
      for (const row of sampleRows) {
        if (!row) continue

        // Acessamos o valor usando a chave tipada como string
        const value = row[key]
        
        if (value !== null && value !== undefined) {
          const cellLength = value.toString().length
          if (cellLength > maxLength) {
            maxLength = cellLength
          }
        }
      }

      // Retorna largura mínima de 10 e máxima de 50 caracteres
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
    })

    ws['!cols'] = colWidths

    // 5. Cria o Workbook e Adiciona a Sheet
    const wb: XLSX.WorkBook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // 6. Garante extensão correta
    const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`

    // 7. Download
    XLSX.writeFile(wb, finalName)
    
  } catch (error) {
    console.error("Erro crítico na exportação Excel:", error)
  }
}