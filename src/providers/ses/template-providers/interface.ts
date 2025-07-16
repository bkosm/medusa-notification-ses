
export interface TemplateProvider {
    listIds(): Promise<string[]>
    getFiles(id: string): Promise<{ template: string; schema: string }>
}
