export function renderBody(body: string, timeLabel: string): string {
  return body.replaceAll('{{time}}', timeLabel);
}
