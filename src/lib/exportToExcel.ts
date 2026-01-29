import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Define a interface para que o TypeScript saiba o que esperar
export interface ExportOptions {
  fileName: string;
  sheetName?: string;
  columns: Partial<ExcelJS.Column>[];
}

/**
 * Gera um arquivo Excel estilizado e profissional.
 * Substitui a biblioteca 'xlsx' (SheetJS) pela 'exceljs' para permitir cores e formatação.
 */
export const exportToExcel = async (data: any[], options: ExportOptions) => {
  // 1. Validação simples
  if (!data || data.length === 0) {
    console.warn('Exportação cancelada: Nenhum dado fornecido.');
    alert('Não há dados para exportar.');
    return;
  }

  // 2. Criar o Workbook (o arquivo Excel em memória)
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Gestão 5S';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(options.sheetName || 'Dados');

  // 3. Configurar Colunas
  worksheet.columns = options.columns.map(col => ({
    ...col,
    style: { 
      font: { name: 'Arial', size: 10 },
      alignment: { vertical: 'middle', wrapText: true } 
    }
  }));

  // 4. Estilizar o Cabeçalho (Header)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  
  headerRow.eachCell((cell) => {
    cell.font = { 
      name: 'Arial', 
      size: 12, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } // Branco
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' } // Teal-600 (Cor do seu tema)
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  });

  // 5. Adicionar os dados
  worksheet.addRows(data);

  // 6. Formatação Condicional nas Linhas (Efeito Zebra)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Ignora o cabeçalho
      // Alternar cores de fundo para facilitar leitura
      if (rowNumber % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' } // Gray-50 muito suave
          };
        });
      }
      
      // Bordas suaves em todas as células
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    }
  });

  // 7. Gerar o arquivo binário (Buffer)
  const buffer = await workbook.xlsx.writeBuffer();
  
  // 8. Criar o Blob e forçar o download
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Garante a extensão correta
  const finalName = options.fileName.endsWith('.xlsx') 
    ? options.fileName 
    : `${options.fileName}.xlsx`;

  saveAs(blob, finalName);
};