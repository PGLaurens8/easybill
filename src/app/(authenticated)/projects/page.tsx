
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { initialProjects } from '@/lib/mock-data';

interface Project {
  id: string;
  name: string;
  description: string;
  units: string[]; // Example: ["Block A", "Block B"]
  status: 'Ongoing' | 'Completed' | 'Planned';
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Partial<Project> | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectUnits, setProjectUnits] = useState('');


  const handleAddNewProject = () => {
    setCurrentProject(null); // Reset for new project
    setProjectName('');
    setProjectDescription('');
    setProjectUnits('');
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setCurrentProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description);
    setProjectUnits(project.units.join(', '));
    setIsModalOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    // Confirmation dialog would be good here
    setProjects(projects.filter(p => p.id !== projectId));
  };

  const handleSubmitProject = () => {
    const unitsArray = projectUnits.split(',').map(u => u.trim()).filter(u => u);
    if (currentProject && currentProject.id) {
      // Edit existing project
      setProjects(projects.map(p => 
        p.id === currentProject.id 
        ? { ...p, name: projectName, description: projectDescription, units: unitsArray } 
        : p
      ));
    } else {
      // Add new project
      const newProject: Project = {
        id: String(Date.now()), // Simple ID generation
        name: projectName,
        description: projectDescription,
        units: unitsArray,
        status: 'Planned', // Default status
      };
      setProjects([...projects, newProject]);
    }
    setIsModalOpen(false);
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Projects</h1>
          <p className="text-muted-foreground">Manage your construction projects and their units.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNewProject} className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Add New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle className="font-headline">{currentProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
              <DialogDescription>
                {currentProject ? 'Update the details of your project.' : 'Enter the details for your new project.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="projectName" className="text-right">Name</Label>
                <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="col-span-3" placeholder="e.g., Skyline Towers" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="projectDescription" className="text-right">Description</Label>
                <Textarea id="projectDescription" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} className="col-span-3" placeholder="e.g., Luxury residential complex..." />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="projectUnits" className="text-right">Units</Label>
                <Input id="projectUnits" value={projectUnits} onChange={(e) => setProjectUnits(e.target.value)} className="col-span-3" placeholder="e.g., Tower A, Tower B (comma-separated)" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmitProject}>Save Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Search className="absolute ml-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/3"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">No projects found.</p>
              {searchTerm && <p className="text-sm text-muted-foreground">Try adjusting your search term.</p>}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map(project => (
                <Card key={project.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="font-headline text-xl">{project.name}</CardTitle>
                    <CardDescription className="h-10 overflow-hidden text-ellipsis">{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm font-medium">Units: <span className="font-normal text-muted-foreground">{project.units.join(', ') || 'N/A'}</span></p>
                    <p className="text-sm font-medium">Status: <span className={`font-semibold ${project.status === 'Completed' ? 'text-green-600' : project.status === 'Ongoing' ? 'text-blue-600' : 'text-yellow-600'}`}>{project.status}</span></p>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between items-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>View Details</Link>
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditProject(project)} className="text-muted-foreground hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProject(project.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
