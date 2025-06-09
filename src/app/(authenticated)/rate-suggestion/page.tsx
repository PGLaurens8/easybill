'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Lightbulb, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { suggestRate, type SuggestRateInput, type SuggestRateOutput } from '@/ai/flows/suggest-rate';
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  boqItemDescription: z.string().min(10, "BOQ item description must be at least 10 characters."),
  marketData: z.string().min(20, "Market data must be at least 20 characters."),
  projectSpecifications: z.string().min(20, "Project specifications must be at least 20 characters."),
  historicalData: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function RateSuggestionPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestRateOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      boqItemDescription: '',
      marketData: '',
      projectSpecifications: '',
      historicalData: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const inputData: SuggestRateInput = {
        boqItemDescription: data.boqItemDescription,
        marketData: data.marketData,
        projectSpecifications: data.projectSpecifications,
        historicalData: data.historicalData || undefined,
      };
      const response = await suggestRate(inputData);
      setResult(response);
      toast({
        title: "Rate Suggested Successfully!",
        description: "AI has provided a rate suggestion.",
      });
    } catch (err: any) {
      console.error("Error suggesting rate:", err);
      const errorMessage = err.message || "An unexpected error occurred while fetching rate suggestion.";
      setError(errorMessage);
      toast({
        title: "Error Suggesting Rate",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Lightbulb className="mr-3 h-8 w-8 text-primary" />
          AI Rate Suggestion
        </h1>
        <p className="text-muted-foreground">
          Get intelligent cost estimates for BOQ items based on market data and project details.
        </p>
      </div>

      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Input Details for Rate Suggestion</CardTitle>
              <CardDescription>Provide the necessary information for the AI to suggest a rate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="boqItemDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BOQ Item Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Supply and install 20mm thick granite countertop" {...field} className="font-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marketData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Data</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Enter current market prices, supplier quotes, material availability, etc." {...field} className="font-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectSpecifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Specifications</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Enter project-specific requirements, quality standards, location factors, etc." {...field} className="font-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="historicalData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Historical Data (Optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Enter data from similar past projects, previous rates for this item, etc." {...field} className="font-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={loading} className="min-w-[150px]">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lightbulb className="mr-2 h-4 w-4" />
                )}
                {loading ? 'Suggesting...' : 'Suggest Rate'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {error && (
        <Card className="border-destructive bg-destructive/10 text-destructive shadow-md">
          <CardHeader className="flex flex-row items-center space-x-2">
            <AlertCircle className="h-6 w-6" />
            <CardTitle className="font-headline">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="shadow-lg border-primary">
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-primary">AI Rate Suggestion Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-accent" />
                    Suggested Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">
                    {result.suggestedRate.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} {/* Assuming USD, adjust as needed */}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">per unit of BOQ item</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Users className="mr-2 h-5 w-5 text-accent" />
                    Supplier Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.supplierSuggestions && result.supplierSuggestions.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-foreground">
                      {result.supplierSuggestions.map((supplier, index) => (
                        <li key={index}>{supplier}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No specific suppliers suggested.</p>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2 font-headline">Justification</h3>
              <div className="p-4 border rounded-md bg-background min-h-[100px] text-foreground/90 font-code text-sm whitespace-pre-wrap">
                {result.justification}
              </div>
            </div>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              Note: This is an AI-generated suggestion. Please verify with market research and professional judgement.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
