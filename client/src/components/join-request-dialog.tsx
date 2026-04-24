// "use client"

// import { useState } from "react"
// import { Send, CheckCircle, User, Briefcase, GraduationCap } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import { useAuth } from "@/lib/auth-context"

// interface JoinRequestDialogProps {
//   projectTitle: string
//   projectOwner: string
//   children: React.ReactNode
// }

// export function JoinRequestDialog({ projectTitle, projectOwner, children }: JoinRequestDialogProps) {
//   const { isAuthenticated, user } = useAuth()
//   const [open, setOpen] = useState(false)
//   const [submitted, setSubmitted] = useState(false)
//   const [formData, setFormData] = useState({
//     name: "",
//     email: "",
//     role: "",
//     experience: "",
//     motivation: "",
//     availability: "",
//     portfolio: "",
//   })

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault()
//     // Simulate submission
//     setSubmitted(true)
//     setTimeout(() => {
//       setOpen(false)
//       setSubmitted(false)
//       setFormData({
//         name: "",
//         email: "",
//         role: "",
//         experience: "",
//         motivation: "",
//         availability: "",
//         portfolio: "",
//       })
//     }, 2000)
//   }

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>{children}</DialogTrigger>
//       <DialogContent className={isAuthenticated ? "sm:max-w-lg max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
//         {!isAuthenticated ? (
//           <>
//             <DialogHeader>
//               <DialogTitle>Login Required</DialogTitle>
//               <DialogDescription>
//                 Please log in to request to join this project.
//               </DialogDescription>
//             </DialogHeader>
//             <div className="flex justify-center py-4">
//               <User className="h-16 w-16 text-muted-foreground" />
//             </div>
//             <p className="text-center text-sm text-muted-foreground">
//               Use the login button in the navigation bar to sign in to your account.
//             </p>
//           </>
//         ) :
//         {submitted ? (
//           <div className="py-8 text-center space-y-4">
//             <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
//               <CheckCircle className="h-8 w-8 text-green-600" />
//             </div>
//             <DialogTitle>Request Sent!</DialogTitle>
//             <DialogDescription>
//               Your request to join &quot;{projectTitle}&quot; has been sent to {projectOwner}. 
//               You&apos;ll receive a notification when they respond.
//             </DialogDescription>
//           </div>
//         ) : (
//           <>
//             <DialogHeader>
//               <DialogTitle>Request to Join Project</DialogTitle>
//               <DialogDescription>
//                 Introduce yourself to the project owner of &quot;{projectTitle}&quot;. 
//                 A good introduction increases your chances of being accepted.
//               </DialogDescription>
//             </DialogHeader>
//             <form onSubmit={handleSubmit} className="space-y-4 pt-4">
//               <div className="grid gap-4 sm:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label htmlFor="name">Your Name</Label>
//                   <Input
//                     id="name"
//                     placeholder="John Doe"
//                     defaultValue={user?.name}
//                     required
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="email">Email</Label>
//                   <Input
//                     id="email"
//                     type="email"
//                     placeholder="john@university.edu"
//                     defaultValue={user?.email}
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="role" className="flex items-center gap-2">
//                   <Briefcase className="h-4 w-4" />
//                   Desired Role
//                 </Label>
//                 <Select 
//                   value={formData.role} 
//                   onValueChange={(value) => setFormData({ ...formData, role: value })}
//                   required
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select your preferred role" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="frontend">Frontend Developer</SelectItem>
//                     <SelectItem value="backend">Backend Developer</SelectItem>
//                     <SelectItem value="fullstack">Full Stack Developer</SelectItem>
//                     <SelectItem value="designer">UI/UX Designer</SelectItem>
//                     <SelectItem value="mobile">Mobile Developer</SelectItem>
//                     <SelectItem value="ml">ML/AI Engineer</SelectItem>
//                     <SelectItem value="pm">Project Manager</SelectItem>
//                     <SelectItem value="other">Other</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="experience" className="flex items-center gap-2">
//                   <GraduationCap className="h-4 w-4" />
//                   Relevant Experience
//                 </Label>
//                 <Textarea
//                   id="experience"
//                   placeholder="Describe your relevant skills and experience. What technologies are you familiar with? Have you worked on similar projects?"
//                   className="min-h-[80px]"
//                   value={formData.experience}
//                   onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
//                   required
//                 />
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="motivation">Why do you want to join?</Label>
//                 <Textarea
//                   id="motivation"
//                   placeholder="What excites you about this project? What do you hope to learn or contribute?"
//                   className="min-h-[80px]"
//                   value={formData.motivation}
//                   onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
//                   required
//                 />
//               </div>

//               <div className="grid gap-4 sm:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label htmlFor="availability">Weekly Availability</Label>
//                   <Select 
//                     value={formData.availability} 
//                     onValueChange={(value) => setFormData({ ...formData, availability: value })}
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder="Hours per week" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="5">{"< 5 hours"}</SelectItem>
//                       <SelectItem value="10">5-10 hours</SelectItem>
//                       <SelectItem value="20">10-20 hours</SelectItem>
//                       <SelectItem value="20+">20+ hours</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="portfolio">Portfolio/GitHub (Optional)</Label>
//                   <Input
//                     id="portfolio"
//                     placeholder="https://github.com/username"
//                     value={formData.portfolio}
//                     onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
//                   />
//                 </div>
//               </div>

//               <div className="flex justify-end gap-3 pt-4">
//                 <Button type="button" variant="outline" onClick={() => setOpen(false)}>
//                   Cancel
//                 </Button>
//                 <Button type="submit">
//                   <Send className="h-4 w-4 mr-2" />
//                   Send Request
//                 </Button>
//               </div>
//             </form>
//           </>
//         )
//         }
//       </DialogContent>
//     </Dialog>
//   )
// }
