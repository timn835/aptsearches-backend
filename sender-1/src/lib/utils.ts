export function formatNumber(n: number): string {
	let workingNumber = Math.abs(n);
	// Calculate the remainder to get right of decimal point
	let remainder =
		Math.round(workingNumber * 100) - Math.floor(workingNumber) * 100;
	let result = `${remainder}`;
	if (result.length === 1) result = "0" + result;
	result = "." + result;

	// adjust the workingNumber to be an integer
	workingNumber = Math.floor(workingNumber);

	// Iterate to get comma values
	while (workingNumber > 999) {
		remainder = workingNumber % 1000;
		result =
			remainder < 10
				? `,00${remainder}${result}`
				: remainder < 100
				? `,0${remainder}${result}`
				: `,${remainder}${result}`;
		workingNumber = Math.floor(workingNumber / 1000);
	}
	result = n < 0 ? `-${workingNumber}${result}` : `${workingNumber}${result}`;

	return result;
}
