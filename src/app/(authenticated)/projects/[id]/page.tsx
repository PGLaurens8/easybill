'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, PlusCircle, Building, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';

// Mock data structure - in a real app, this would come from a data source
interface Project {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  units: { id: string; name: string; status: string; area?: number }[];
  status: 'Ongoing' | 'Completed' | 'Planned';
  startDate?: string;
  endDate?: string;
  budget?: number;
  imageUrl?: string;
}

const mockProjects: Project[] = [
  { 
    id: '1', 
    name: 'Skyline Towers', 
    description: 'Luxury residential complex with 3 towers.', 
    longDescription: 'Skyline Towers is a flagship luxury residential project featuring three iconic towers. It offers state-of-the-art amenities, breathtaking city views, and meticulously designed living spaces. The project emphasizes sustainable construction practices and modern architectural design.',
    units: [
      { id: 'u1a', name: 'Tower A - Unit 101', status: 'Sold', area: 120 },
      { id: 'u1b', name: 'Tower A - Unit 102', status: 'Available', area: 150 },
      { id: 'u1c', name: 'Tower B - Penthouse', status: 'Under Construction', area: 300 },
    ], 
    status: 'Ongoing', 
    startDate: '2022-01-15', 
    endDate: '2025-06-30', 
    budget: 50000000,
    imageUrl: 'https://placehold.co/800x400.png',
  },
  { 
    id: '2', 
    name: 'Greenfield Mall', 
    description: 'Large commercial shopping mall development.', 
    longDescription: 'Greenfield Mall is set to be the largest commercial hub in the region. This development includes a vast array of retail spaces, entertainment zones, food courts, and ample parking. Designed with a focus on visitor experience and sustainability.',
    units: [
      { id: 'u2a', name: 'Retail Unit G-05', status: 'Leased', area: 200 },
      { id: 'u2b', name: 'Food Court Stall FC-12', status: 'Available for Lease', area: 50 },
    ], 
    status: 'Planned', 
    startDate: '2024-08-01',
    budget: 120000000,
    imageUrl: 'https://placehold.co/800x400.png',
  },
];


export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    // Fetch project details based on projectId
    // For now, using mock data
    const foundProject = mockProjects.find(p => p.id === projectId);
    if (foundProject) {
      setProject(foundProject);
    } else {
      // Handle project not found, e.g., redirect or show error
      // router.push('/projects'); 
    }
  }, [projectId, router]);

  if (!project) {
    return <div className="flex items-center justify-center h-full">Loading project details...</div>;
  }

  const getStatusIcon = (status: Project['status']) => {
    if (status === 'Completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'Ongoing') return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
    return <Building className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
      </Button>

      <Card className="shadow-lg overflow-hidden">
        {project.imageUrl && (
          <div className="relative h-64 w-full">
            <Image 
              src={project.imageUrl} 
              alt={project.name} 
              layout="fill" 
              objectFit="cover" 
              data-ai-hint="building exterior"
            />
          </div>
        )}
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-3xl font-bold font-headline">{project.name}</CardTitle>
              <CardDescription className="text-lg">{project.description}</CardDescription>
            </div>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Edit Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xl font-semibold font-headline">Project Overview</h3>
            <p className="text-muted-foreground leading-relaxed">{project.longDescription}</p>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <p className="text-sm font-medium text-foreground">Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(project.status)}
                  <p className="font-semibold">{project.status}</p>
                </div>
              </div>
              {project.budget && (
                <div>
                  <p className="text-sm font-medium text-foreground">Budget</p>
                  <p className="font-semibold">${project.budget.toLocaleString()}</p>
                </div>
              )}
              {project.startDate && (
                 <div>
                  <p className="text-sm font-medium text-foreground">Start Date</p>
                  <p className="font-semibold">{new Date(project.startDate).toLocaleDateString()}</p>
                </div>
              )}
              {project.endDate && (
                 <div>
                  <p className="text-sm font-medium text-foreground">Est. End Date</p>
                  <p className="font-semibold">{new Date(project.endDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold font-headline">Units / Sections</h3>
              <Button variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Unit
              </Button>
            </div>
            {project.units.length > 0 ? (
              <ul className="space-y-3">
                {project.units.map(unit => (
                  <li key={unit.id} className="p-3 border rounded-md bg-background hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-foreground">{unit.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{unit.status}</span>
                    </div>
                    {unit.area && <p className="text-sm text-muted-foreground">Area: {unit.area} sqm</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No units defined for this project yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for related BOQs, Claims, etc. */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Related BOQs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bill of Quantities associated with {project.name} will appear here.</p>
            <Button variant="link" asChild className="p-0 h-auto mt-2"><Link href={`/boq?projectId=${project.id}`}>View BOQs</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Project Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Claims submitted for {project.name} will be listed here.</p>
            <Button variant="link" asChild className="p-0 h-auto mt-2"><Link href={`/claims?projectId=${project.id}`}>View Claims</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
