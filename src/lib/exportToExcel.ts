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
  // 1. Validação de segurança
  if (!data || data.length === 0) {
    console.warn('Exportação cancelada: Nenhum dado fornecido.')
    return
  }

  try {
    // 2. Converte JSON para Sheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data)

    // 3. Lógica de Auto-Width (Largura das Colunas)
    // Coleta todas as chaves possíveis de todos os objetos para garantir que o header esteja completo
    const allKeys = Array.from(new Set(data.flatMap(Object.keys)))

    const colWidths = allKeys.map(key => {
      let maxLength = key.toString().length // Começa com o tamanho do título da coluna

      // CORREÇÃO DO ERRO TS2532:
      // Em vez de acessar data[i] (que o TS acha que pode ser nulo),
      // criamos um sub-array seguro com as primeiras 100 linhas e iteramos sobre o item direto.
      const sampleRows = data.slice(0, 100)
      
      for (const row of sampleRows) {
        // Verificação defensiva extra (embora slice garanta itens em arrays densos)
        if (!row) continue

        const value = row[key]
        
        if (value !== null && value !== undefined) {
          const cellLength = value.toString().length
          if (cellLength > maxLength) {
            maxLength = cellLength
          }
        }
      }

      // Adiciona um respiro (+2) e define um limite máximo (50 chars) para não quebrar o layout
      return { wch: Math.min(maxLength + 2, 50) }
    })

    ws['!cols'] = colWidths

    // 4. Cria o Workbook e Adiciona a Sheet
    const wb: XLSX.WorkBook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // 5. Garante extensão correta
    const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`

    // 6. Download
    XLSX.writeFile(wb, finalName)
    
  } catch (error) {
    console.error("Erro crítico na exportação Excel:", error)
    throw new Error('Falha ao gerar o arquivo Excel. Verifique os dados e tente novamente.')
  }
}