export class QuestionEngine {
  generate(conceptId: string): { id: string; text: string } {
    return { id: `q-${Date.now()}`, text: `Pregunta de repaso para ${conceptId}` };
  }
}
