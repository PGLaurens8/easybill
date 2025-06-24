
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Briefcase, ClipboardList, FileText, FileSpreadsheet, Lightbulb, Users, ArrowRight, BarChart3, TrendingUp, DollarSign, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
// Import mock data to make the dashboard dynamic
import { initialProjects } from '../projects/page';
import { initialClaims } from '../claims/page';
import { boqData } from '../boq/page'; // Assuming boqData is exported from boq/page

const featureCards = [
  {
    title: "Project Setup",
    description: "Define projects, link units, and manage project details seamlessly.",
    icon: Briefcase,
    href: "/projects",
    imgHint: "construction site"
  },
  {
    title: "BOQ Generator",
    description: "Quickly generate Bills of Quantities using predefined trade templates.",
    icon: ClipboardList,
    href: "/boq",
    imgHint: "blueprint document"
  },
  {
    title: "Claims System",
    description: "Subcontractors submit claims, QS approve them against BOQ items.",
    icon: FileText,
    href: "/claims",
    imgHint: "financial report"
  },
  {
    title: "Payment Certificates",
    description: "Generate PDF payment certificates with approved quantities and amounts.",
    icon: FileSpreadsheet,
    href: "/payment-certificates",
    imgHint: "certificate document"
  },
  {
    title: "AI Rate Suggestion",
    description: "Get AI-powered cost estimates based on current market data.",
    icon: Lightbulb,
    href: "/rate-suggestion",
    imgHint: "data analytics"
  },
];

export default function DashboardPage() {
  // State for dynamic stats
  const [activeProjects, setActiveProjects] = useState(0);
  const [pendingClaims, setPendingClaims] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  
  const [totalProjectValue, setTotalProjectValue] = useState(0);
  const [totalProjectCost, setTotalProjectCost] = useState(0);
  const [totalApprovedCost, setTotalApprovedCost] = useState(0);


  useEffect(() => {
    // Calculate stats from mock data. In a real app, this would come from an API.
    setActiveProjects(initialProjects.filter(p => p.status === 'Ongoing').length);
    const pending = initialClaims.filter(c => c.status === 'Pending');
    setPendingClaims(pending.length);
    
    // Calculate financial snapshot from BOQ data
    const { totalValue, totalCost } = boqData.reduce((acc, item) => {
        const itemValue = item.quantity * item.developerRate;
        const itemCost = item.quantity * item.subcontractorRate;
        acc.totalValue += itemValue;
        acc.totalCost += itemCost;
        return acc;
    }, { totalValue: 0, totalCost: 0 });

    setTotalProjectValue(totalValue);
    setTotalProjectCost(totalCost);
    
    const approvedClaimsValue = initialClaims
      .filter(c => c.status === 'Approved')
      .reduce((acc, claim) => acc + claim.claimedAmount, 0);
    setTotalApprovedCost(approvedClaimsValue);

    setTotalUsers(3); // Static for now
  }, []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
  };
  
  const overallMargin = totalProjectValue - totalProjectCost;

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Welcome to QuantEasy Dashboard</CardTitle>
          <CardDescription className="text-lg">Your central hub for managing all quantity surveying tasks efficiently.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-foreground/80 leading-relaxed">
                QuantEasy streamlines your workflow from project inception to final payment. Utilize our powerful tools to manage projects, generate BOQs, handle claims, and get AI-driven rate suggestions.
              </p>
              <Button asChild className="mt-6">
                <Link href="/projects">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="relative h-64 w-full overflow-hidden rounded-lg">
               <Image 
                src="https://placehold.co/600x400.png" 
                alt="Construction planning" 
                layout="fill" 
                objectFit="cover"
                data-ai-hint="construction planning"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featureCards.map((feature) => (
          <Card key={feature.title} className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold font-headline">{feature.title}</CardTitle>
              <feature.icon className="h-6 w-6 text-accent" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
              <Button variant="outline" asChild size="sm">
                <Link href={feature.href}>Go to {feature.title} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Quick Stats</CardTitle>
          <CardDescription>Overview of your current activities.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center space-x-4 rounded-md border p-4 bg-card-foreground/5">
            <Briefcase className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{activeProjects}</p>
              <p className="text-sm text-muted-foreground">Active Projects</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-md border p-4 bg-card-foreground/5">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{pendingClaims}</p>
              <p className="text-sm text-muted-foreground">Pending Claims</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-md border p-4 bg-card-foreground/5">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center"><BarChart3 className="mr-3 text-primary h-6 w-6" />Financial Snapshot</CardTitle>
            <CardDescription>High-level view of overall project financials based on all BOQs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                <DollarSign className="h-8 w-8 text-blue-500 mt-1" />
                <div>
                    <p className="text-sm text-muted-foreground">Total Project Value (Dev. Rate)</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalProjectValue)}</p>
                </div>
            </div>
            <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                <TrendingUp className="h-8 w-8 text-red-500 mt-1" />
                <div>
                    <p className="text-sm text-muted-foreground">Total Project Cost (Sub-Rate)</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalProjectCost)}</p>
                </div>
            </div>
            <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                <ShieldCheck className={`h-8 w-8 mt-1 ${overallMargin >= 0 ? 'text-green-500' : 'text-yellow-500'}`} />
                <div>
                    <p className="text-sm text-muted-foreground">Planned Overall Margin</p>
                    <p className="text-2xl font-bold">{formatCurrency(overallMargin)}</p>
                </div>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
