import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// CONFIGURACIÓN
// @ts-ignore: Deno type definition missing in environment
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
// IMPORTANTE: Usamos la Service Role Key para poder crear usuarios y saltarnos las RLS
// @ts-ignore: Deno type definition missing in environment
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// @ts-ignore: Deno type definition missing in environment
const HOTMART_SECRET = Deno.env.get("HOTMART_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // 1. Solo aceptar POST
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // 2. Parsear el body (Hotmart envía JSON)
    const body = await req.json();
    const { hottok, email, prod, name } = body;

    // Nota: Hotmart a veces envía el email dentro de un objeto 'buyer'.
    // Si 'email' viene vacío arriba, intentamos buscarlo en la estructura anidada común.
    const buyerEmail = email || body?.buyer?.email || body?.data?.buyer?.email;
    const productId = prod || body?.data?.product?.id; // 'prod' es el ID estándar en webhooks antiguos, 'product.id' en nuevos

    // 3. SEGURIDAD: Verificar Token de Hotmart
    if (hottok !== HOTMART_SECRET && body?.hottok !== HOTMART_SECRET) {
      console.error("Token de Hotmart inválido");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    if (!buyerEmail || !productId) {
      return new Response(JSON.stringify({ error: "Missing email or product ID" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    console.log(`Procesando venta: Email=${buyerEmail}, Prod=${productId}`);

    // 4. LÓGICA DE CURSO: Buscar el curso en Supabase
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("hotmart_id", String(productId)) // Aseguramos que sea string
      .single();

    if (courseError || !course) {
      console.error(`Curso con hotmart_id ${productId} no encontrado.`);
      // Devolvemos 200 para que Hotmart no reintente infinitamente si el producto no es nuestro
      return new Response(JSON.stringify({ message: "Course not found, skipping" }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // 5. LÓGICA DE USUARIO: Buscar o Crear
    let userId: string;

    // A. Buscar usuario existente por email (usamos listUsers del admin api)
    // Nota: Buscar en la tabla 'profiles' es más barato, pero 'admin.createUser' es la fuente de verdad.
    // Vamos a intentar consultar profiles primero.
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", buyerEmail)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
      console.log(`Usuario existente encontrado: ${userId}`);
    } else {
      // B. Crear usuario nuevo
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        password: tempPassword,
        email_confirm: true, // Confirmamos automáticamente
        user_metadata: {
          full_name: name || body?.buyer?.name || "Estudiante", // Intentar sacar el nombre
        },
      });

      if (createError) {
        // Si falla porque "ya existe" (pero no lo encontramos en profiles por alguna razón), intentamos recuperarlo
        if (createError.message.includes("already registered")) {
           // Fallback raro: el usuario está en Auth pero no en Profiles
           // En este caso, no podemos inscribirlo fácilmente sin su ID.
           console.error("El usuario existe en Auth pero hubo error al recuperar ID", createError);
           return new Response(JSON.stringify({ error: "User exists but retrieval failed" }), { status: 500 });
        }
        console.error("Error creando usuario:", createError);
        return new Response(JSON.stringify({ error: createError.message }), { status: 500 });
      }

      userId = newUser.user.id;
      console.log(`Nuevo usuario creado: ${userId}`);
      
      // Opcional: Podrías enviar un email aquí con la contraseña temporal usando Resend o similar
    }

    // 6. INSCRIPCIÓN: Insertar en enrollments
    const { error: enrollError } = await supabase
      .from("enrollments")
      .upsert(
        { user_id: userId, course_id: course.id },
        { onConflict: "user_id, course_id" } // Ignorar si ya está inscrito
      );

    if (enrollError) {
      console.error("Error en inscripción:", enrollError);
      return new Response(JSON.stringify({ error: "Enrollment failed" }), { status: 500 });
    }

    console.log(`Inscripción exitosa: Usuario ${userId} -> Curso ${course.title}`);

    // 7. RESPUESTA FINAL
    return new Response(JSON.stringify({ message: "Success", course: course.title, user: userId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error inesperado:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
    });
  }
});