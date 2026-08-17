const prisma = require("../config/db")

const createWorkspace= async(req , res)=>{
  try{
  const { name } = req.body;
  const ownerId = req.user.userId;
  if (!name) {
  return res.status(400).json({
    message: "Please provide a name"
  });
}



  const result = await prisma.$transaction(async (tx) => {
  const workspace = await tx.workspace.create({
    data: {
      name,
      ownerId
    }
  });

  const member = await tx.workspaceMember.create({
    data: {
      userId: ownerId,
      workspaceId: workspace.id
    }
  });

  return { workspace, member };
});
   
  
  return res.status(201).json({
  message: "Workspace Created",
  workspace: result.workspace,
  member: result.member
})
}
catch(error){
    console.error(error);

  return res.status(500).json({
    message: "Internal server error"
  });
}
}

module.exports ={createWorkspace}