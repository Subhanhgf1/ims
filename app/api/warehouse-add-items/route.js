
import { prisma } from "@/lib/prisma"
import {rawMaterials, finished_goods} from "../rawmaterials.js";

// export async function GET(req) {
//   try {
//     console.log("Updating raw materials...");
    


//     // Clear existing raw materials
//     await prisma.rawMaterial.deleteMany();

//     // Insert new raw materials
//     for (const material of rawMaterials) {
//       await prisma.rawMaterial.create({
//         data: material
//       });
//     }

//     return new Response(JSON.stringify({ message: "Raw materials updated successfully" }), {
//       headers: { "Content-Type": "application/json" }
//     });
//   } catch (error) {
//     console.error("Error updating raw materials:", error);
//     return new Response(JSON.stringify({ error: "Internal Server Error" }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" }
//     });
//   }
// }

export async function GET(req) {
try{
    await prisma.finishedGood.deleteMany();

    for (const good of finished_goods) {
      await prisma.finishedGood.create({
        data: good
      });
    }
    return new Response(JSON.stringify({ message: "Finished goods updated successfully" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
    catch (error) {
    console.error("Error updating finished goods:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
}
}