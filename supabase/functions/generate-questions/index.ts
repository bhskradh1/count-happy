import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface GeneratedQuestion {
  id: string;
  subject: string;
  exam: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ useFallback: true, message: 'AI gateway not configured. Using offline question bank.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { exam, subject, count = 8, topic = 'General syllabus' } = body || {};

    if (!exam || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing exam type or subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prompt = `Generate ${count} highly realistic, multiple-choice questions for Nepal's ${exam} Entrance Exam (Engineering or Medical).
These questions should represent the relative difficulty and key concepts found in typical past paper syllabi.
Exam: ${exam}
Subject: ${subject}
Focus Area/Topic: ${topic}

Ensure options are plausible distractors and contain exactly one clear correct answer.
Provide a logical, helpful educational explanation for the correct option.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert IOE (Nepal Institute of Engineering Admission test) and CEE (Common Entrance Examination Nepal) prep professor and question designer. Generate standard entrance-level conceptually deep questions. Use the provided tool to return the question set.',
          },
          { role: 'user', content: prompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_questions',
              description: 'Submit the generated MCQ question set',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        subject: { type: 'string' },
                        exam: { type: 'string' },
                        question: { type: 'string' },
                        options: { type: 'array', items: { type: 'string' } },
                        correctIndex: { type: 'integer' },
                        explanation: { type: 'string' },
                      },
                      required: ['id', 'subject', 'exam', 'question', 'options', 'correctIndex', 'explanation'],
                    },
                  },
                },
                required: ['questions'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'submit_questions' } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error('AI gateway error', aiResp.status, text);
      return new Response(
        JSON.stringify({ useFallback: true, message: `AI gateway error ${aiResp.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    let questionSet: GeneratedQuestion[] = [];
    if (argsRaw) {
      try {
        const parsed = JSON.parse(argsRaw);
        questionSet = parsed.questions || [];
      } catch (e) {
        console.error('Failed to parse tool args', e);
      }
    }

    if (!questionSet.length) {
      return new Response(
        JSON.stringify({ useFallback: true, message: 'AI returned no questions.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ questionSet, useFallback: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-questions error', err);
    return new Response(
      JSON.stringify({ useFallback: true, message: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
