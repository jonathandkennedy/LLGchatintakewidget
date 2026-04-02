export async function readJsonBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
