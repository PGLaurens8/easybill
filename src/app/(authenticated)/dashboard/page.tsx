'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Briefcase, ClipboardList, FileText, FileSpreadsheet, Lightbulb, Users, ArrowRight } from "lucide-react";
import Image from "next/image";

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
              <p className="text-2xl font-bold">5</p>
              <p className="text-sm text-muted-foreground">Active Projects</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-md border p-4 bg-card-foreground/5">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-muted-foreground">Pending Claims</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-md border p-4 bg-card-foreground/5">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
