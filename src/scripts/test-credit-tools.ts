import { AmortizationService } from "../services/amortization.service";

import { createGenerateAmortizationScheduleTool } from "../mcp/tools/generate-amortization-schedule.tool";

import { RefinancingService } from "../services/refinancing.service";

import { createAnalyzeRefinancingTool } from "../mcp/tools/analyze-refinancing.tool";
async function testRefinancing() {
  const refinancingService = new RefinancingService();

  const analyzeRefinancing = createAnalyzeRefinancingTool(refinancingService);

  const result = await analyzeRefinancing({
    currentBalance: 620000,

    currentAnnualRate: 14.2,

    remainingTermMonths: 84,

    newAnnualRate: 10.8,

    newTermMonths: 84,

    refinancingFees: 12000,
  });

  console.log("\n===== REFINANCING =====");

  console.table({
    recommended: result.recommended,

    currentMonthlyPayment: result.currentMonthlyPayment,

    newMonthlyPayment: result.newMonthlyPayment,

    monthlySavings: result.monthlySavings,

    grossSavings: result.grossSavings,

    refinancingFees: result.refinancingFees,

    netSavings: result.netSavings,

    breakEvenMonths: result.breakEvenMonths,
  });
}
async function testAmortization() {
  const amortizationService = new AmortizationService();

  const generateAmortizationSchedule =
    createGenerateAmortizationScheduleTool(amortizationService);

  const result = await generateAmortizationSchedule({
    principal: 850000,
    annualInterestRate: 11.5,
    termMonths: 120,
  });

  console.log("\n===== AMORTIZATION =====");

  console.log({
    principal: result.principal,
    annualInterestRate: result.annualInterestRate,
    termMonths: result.termMonths,
    monthlyPayment: result.monthlyPayment,
    totalPayment: result.totalPayment,
    totalInterest: result.totalInterest,
  });

  console.log("\nPrimeros 3 pagos:");

  console.table(result.schedule.slice(0, 3));
}
async function main() {
  await testAmortization();

  await testRefinancing();
}

main().catch((error) => {
  console.error("Tool test failed:", error);

  process.exit(1);
});
