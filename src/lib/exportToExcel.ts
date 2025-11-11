import * as XLSX from 'xlsx'

interface ExportData {
  [key: string]: any
}

/**
 * Converte um array de objetos JSON em um arquivo Excel (XLSX) e inicia o download.
 * @param data O array de dados a ser exportado.
 * @param fileName O nome do arquivo (sem a extensão .xlsx).
 */
export function exportToExcel(data: ExportData[], fileName: string): void {
  try {
    // 1. Converte o JSON para uma planilha (worksheet)
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data)
    
    const colWidths = Object.keys(data[0] || {}).map(key => {
      // Pega o tamanho do header
      let maxLength = key.toString().length
      
      // Verifica o tamanho de cada célula na coluna
      data.forEach(row => {
        const cellValue = row[key]
        if (cellValue != null) {
          const cellLength = cellValue.toString().length
          if (cellLength > maxLength) {
            maxLength = cellLength
          }
        }
      })
      return { wch: maxLength + 2 }
    })
    ws['!cols'] = colWidths

    // 2. Cria um novo workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new()

    // 3. Adiciona a planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Avaliações')

    // 4. Gera o arquivo e inicia o download
    XLSX.writeFile(wb, `${fileName}.xlsx`)
    
  } catch (error) {
    console.error("Erro ao exportar para Excel:", error)

    throw new Error('Falha ao gerar o arquivo Excel.')
  }
}