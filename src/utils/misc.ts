export const tryOrFail = async <T>(
	fn: Promise<T>,
): Promise<
	| { success: true; data: Awaited<T>; error: null }
	| {
			success: false;
			data: null;
			error: Error;
	  }
> => {
	try {
		const data = await fn;
		return { success: true, data, error: null };
	} catch (e) {
		return { success: false, data: null, error: e as Error };
	}
};