'use server';

/**
 * @fileOverview AI rate suggestion for BOQ items based on current market data.
 *
 * - suggestRate - A function that suggests rates for BOQ items.
 * - SuggestRateInput - The input type for the suggestRate function.
 * - SuggestRateOutput - The return type for the suggestRate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRateInputSchema = z.object({
  boqItemDescription: z
    .string()
    .describe('Description of the Bill of Quantities (BOQ) item.'),
  marketData: z
    .string()
    .describe(
      'Up-to-date market data from various suppliers, including prices and availability.'
    ),
  projectSpecifications: z
    .string()
    .describe('Detailed specifications of the construction project.'),
  historicalData: z
    .string()
    .optional()
    .describe(
      'Optional historical data on similar projects, including previous rates and supplier information.'
    ),
});
export type SuggestRateInput = z.infer<typeof SuggestRateInputSchema>;

const SuggestRateOutputSchema = z.object({
  suggestedRate: z
    .number()
    .describe('The AI-suggested rate for the BOQ item, in local currency.'),
  justification: z
    .string()
    .describe(
      'A detailed justification for the suggested rate, including references to market data and project specifications.'
    ),
  supplierSuggestions: z
    .array(z.string())
    .describe(
      'A list of potential suppliers for the BOQ item, based on market data.'
    ),
});
export type SuggestRateOutput = z.infer<typeof SuggestRateOutputSchema>;

export async function suggestRate(input: SuggestRateInput): Promise<SuggestRateOutput> {
  return suggestRateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRatePrompt',
  input: {schema: SuggestRateInputSchema},
  output: {schema: SuggestRateOutputSchema},
  prompt: `You are an AI assistant for quantity surveyors, specialized in suggesting rates for Bill of Quantities (BOQ) items.

  Based on the provided market data, project specifications, and historical data (if available), suggest an appropriate rate for the following BOQ item.

  BOQ Item Description: {{{boqItemDescription}}}
  Market Data: {{{marketData}}}
  Project Specifications: {{{projectSpecifications}}}
  Historical Data (if available): {{{historicalData}}}

  Provide a detailed justification for your suggested rate, including references to specific data points.
  Also, suggest a list of potential suppliers for the BOQ item.

  Ensure that the suggested rate is competitive and reflects current market conditions.

  Output the rate as a number, without currency symbol.
  `,
});

const suggestRateFlow = ai.defineFlow(
  {
    name: 'suggestRateFlow',
    inputSchema: SuggestRateInputSchema,
    outputSchema: SuggestRateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
