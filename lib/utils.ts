export const toArray = <T>(obj: T | T[]): T[] => {
    return Array.isArray(obj) ? obj : [obj];
}