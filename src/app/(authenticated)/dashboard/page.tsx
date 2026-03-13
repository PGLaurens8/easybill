
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Briefcase, ClipboardList, FileText, FileSpreadsheet, Lightbulb, Users, ArrowRight, BarChart3, TrendingUp, DollarSign, ShieldCheck, Banknote, Target } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { boqData, initialClaims, initialProjects } from '@/lib/mock-data';

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
    title: "Rate Templates",
    description: "Build reusable rate templates from component costs.",
    icon: Lightbulb,
    href: "/rate-templates",
    imgHint: "calculator blueprint"
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
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingClaims: 0,
    totalUsers: 3,
    totalProjectValue: 0,
    totalProjectCost: 0,
    plannedMargin: 0,
    approvedClaimsValue: 0,
    valueAtDevRateForApprovedWork: 0,
    actualMargin: 0,
  });

  useEffect(() => {
    // Calculate stats from mock data. In a real app, this would come from an API.
    const activeProjects = initialProjects.filter(p => p.status === 'Ongoing').length;
    const pendingClaims = initialClaims.filter(c => c.status === 'Pending').length;
    
    // Calculate financial snapshot from BOQ data
    const { totalValue, totalCost } = boqData.reduce((acc, item) => {
        const itemValue = item.quantity * item.developerRate;
        const itemCost = item.quantity * item.subcontractorRate;
        acc.totalValue += itemValue;
        acc.totalCost += itemCost;
        return acc;
    }, { totalValue: 0, totalCost: 0 });

    const plannedMargin = totalValue - totalCost;

    // Calculate performance from Claims data
    const approvedClaims = initialClaims.filter(c => c.status === 'Approved');
    const approvedClaimsValue = approvedClaims.reduce((acc, claim) => acc + claim.claimedAmount, 0);

    const { valueAtDevRateForApprovedWork, actualMargin } = approvedClaims.reduce((acc, claim) => {
      const boqItem = boqData.find(b => b.id === claim.boqItemId);
      if (boqItem) {
        const valueOfWork = claim.claimedQuantity * boqItem.developerRate;
        const costOfWork = claim.claimedAmount; // This is the subcontractor cost
        acc.valueAtDevRateForApprovedWork += valueOfWork;
        acc.actualMargin += valueOfWork - costOfWork;
      }
      return acc;
    }, { valueAtDevRateForApprovedWork: 0, actualMargin: 0 });

    setStats({
      activeProjects,
      pendingClaims,
      totalUsers: 3, // Static for now
      totalProjectValue: totalValue,
      totalProjectCost: totalCost,
      plannedMargin,
      approvedClaimsValue,
      valueAtDevRateForApprovedWork,
      actualMargin
    });
  }, []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
  };
  
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
              <p className="text-2xl font-bold">{stats.activeProjects}</p>
              <p className="text-sm text-muted-foreground">Active Projects</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-md border p-4 bg-card-foreground/5">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.pendingClaims}</p>
              <p className="text-sm text-muted-foreground">Pending Claims</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-md border p-4 bg-card-foreground/5">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center"><BarChart3 className="mr-3 text-primary h-6 w-6" />Overall Project Financials</CardTitle>
              <CardDescription>High-level view of overall project financials based on all BOQs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-1">
              <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                  <DollarSign className="h-8 w-8 text-blue-500 mt-1" />
                  <div>
                      <p className="text-sm text-muted-foreground">Total Project Value (Dev. Rate)</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalProjectValue)}</p>
                  </div>
              </div>
              <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                  <TrendingUp className="h-8 w-8 text-red-500 mt-1" />
                  <div>
                      <p className="text-sm text-muted-foreground">Total Project Cost (Sub-Rate)</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalProjectCost)}</p>
                  </div>
              </div>
              <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                  <Target className={`h-8 w-8 mt-1 ${stats.plannedMargin >= 0 ? 'text-green-500' : 'text-yellow-500'}`} />
                  <div>
                      <p className="text-sm text-muted-foreground">Planned Overall Margin</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.plannedMargin)}</p>
                  </div>
              </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center"><BarChart3 className="mr-3 text-accent h-6 w-6" />Performance to Date</CardTitle>
              <CardDescription>Financial performance based on approved claims.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-1">
              <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                  <Banknote className="h-8 w-8 text-blue-500 mt-1" />
                  <div>
                      <p className="text-sm text-muted-foreground">Value of Approved Work (Dev. Rate)</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.valueAtDevRateForApprovedWork)}</p>
                  </div>
              </div>
              <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                  <TrendingUp className="h-8 w-8 text-red-500 mt-1" />
                  <div>
                      <p className="text-sm text-muted-foreground">Cost of Approved Work (Paid Claims)</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.approvedClaimsValue)}</p>
                  </div>
              </div>
              <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                  <ShieldCheck className={`h-8 w-8 mt-1 ${stats.actualMargin >= 0 ? 'text-green-500' : 'text-yellow-500'}`} />
                  <div>
                      <p className="text-sm text-muted-foreground">Actual Margin Realized</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.actualMargin)}</p>
                  </div>
              </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
