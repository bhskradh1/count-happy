export interface RawQuestion {
  id: string;
  subject: "Physics" | "Chemistry" | "Mathematics" | "Biology";
  exam: "IOE" | "CEE" | "BOTH";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const SYLLABUS_SUBJECTS = {
  IOE: ["Physics", "Chemistry", "Mathematics"],
  CEE: ["Physics", "Chemistry", "Biology"],
};

export const LOCAL_QUESTION_BANK: RawQuestion[] = [
  // --- PHYSICS (CEE & IOE) ---
  {
    id: "phy_01",
    subject: "Physics",
    exam: "BOTH",
    question: "A body of mass 2 kg moving with velocity 4 m/s collides elastically with another body of mass 2 kg at rest. What are their velocities after collision?",
    options: [
      "Both move with 2 m/s",
      "First body comes to rest, second moves with 4 m/s",
      "Both come to rest",
      "First body moves with -4 m/s, second remains at rest"
    ],
    correctIndex: 1,
    explanation: "In an elastic head-on collision of two equal masses, and one is initially at rest, the velocities are completely exchanged. The first body comes to rest (0 m/s), and the second takes off with the first's initial velocity (4 m/s)."
  },
  {
    id: "phy_02",
    subject: "Physics",
    exam: "BOTH",
    question: "The temperature of a gas is raised from 27°C to 927°C. By what factor does the root mean square (rms) speed of its molecules increase?",
    options: [
      "2 times",
      "3 times",
      "4 times",
      "9 times"
    ],
    correctIndex: 0,
    explanation: "The rms speed of gas molecules is proportional to the square root of the absolute temperature T (in Kelvin). T1 = 27 + 273 = 300 K, T2 = 927 + 273 = 1200 K. The ratio is sqrt(1200/300) = sqrt(4) = 2 times."
  },
  {
    id: "phy_03",
    subject: "Physics",
    exam: "BOTH",
    question: "A wire of resistance R is stretched uniformly to double its initial length. What is its new resistance?",
    options: [
      "2 R",
      "R / 2",
      "4 R",
      "R / 4"
    ],
    correctIndex: 2,
    explanation: "When a wire is stretched to double its length (L' = 2L), its volume remains constant, meaning its cross-sectional area decreases to half (A' = A/2). Since R = ρ * (L/A), the new resistance R' = ρ * (2L / (A/2)) = 4 * ρ * (L/A) = 4R."
  },
  {
    id: "phy_04",
    subject: "Physics",
    exam: "BOTH",
    question: "What is the phase difference between current and voltage in a purely capacitive AC circuit?",
    options: [
      "Voltage leads current by π/2 radians",
      "Current leads voltage by π/2 radians",
      "Voltage and current are in phase",
      "Current leads voltage by π radians"
    ],
    correctIndex: 1,
    explanation: "In a purely capacitive circuit, the alternating current 'leads' the alternating voltage by a phase angle of 90 degrees (π/2 radians), meaning peak current is reached before peak voltage."
  },
  {
    id: "phy_05",
    subject: "Physics",
    exam: "BOTH",
    question: "If the distance between two charges is doubled and their magnitudes are halved, the electrostatic force between them:",
    options: [
      "Remains unchanged",
      "Becomes 1/4th",
      "Becomes 1/8th",
      "Becomes 1/16th"
    ],
    correctIndex: 3,
    explanation: "Coulomb's Law states F = k * (q1 * q2) / d^2. If charges are halved (1/2 * 1/2 = 1/4) and distance is doubled (factors in as /2^2 = /4), the new force is (1/4) / 4 = 1/16 of the original force."
  },

  // --- CHEMISTRY (CEE & IOE) ---
  {
    id: "chem_01",
    subject: "Chemistry",
    exam: "BOTH",
    question: "Which of the following organic compounds will exhibit positive iodoform test?",
    options: [
      "Methanol",
      "Ethanol",
      "Diethyl ether",
      "Benzaldehyde"
    ],
    correctIndex: 1,
    explanation: "Ethanol (CH3CH2OH) can be oxidized in-situ to acetaldehyde (CH3CHO) which contains the methyl carbonyl group (CH3-C=O). Thus it reacts with I2 and NaOH to yield a yellow precipitate of iodoform (CHI3)."
  },
  {
    id: "chem_02",
    subject: "Chemistry",
    exam: "BOTH",
    question: "What is the hybridisation of xenon in XeF4 (Xenon Tetrafluoride)?",
    options: [
      "sp3",
      "sp3d",
      "sp3d2",
      "dsp2"
    ],
    correctIndex: 2,
    explanation: "Xenon has 8 valence electrons. In XeF4, it forms 4 single covalent bonds with fluorine and retains 2 lone pairs. Static steric number is bond pairs + lone pairs = 4 + 2 = 6, which corresponds to sp3d2 hybridisation and a square planar shape."
  },
  {
    id: "chem_03",
    subject: "Chemistry",
    exam: "BOTH",
    question: "The pH of a 10^-8 M aqueous solution of HCl is:",
    options: [
      "Exactly 8",
      "Slightly above 7",
      "Slightly below 7",
      "Exactly 6"
    ],
    correctIndex: 2,
    explanation: "Since the solution is extremely dilute, we cannot ignore water's auto-ionisation (which contributes 10^-7 M [H+]). Total [H+] = 10^-8 + 10^-7 = 1.1 x 10^-7 M. Taking -log(1.1 x 10^-7) yields a pH of approximately 6.96, which is slightly acidic (below 7)."
  },
  {
    id: "chem_04",
    subject: "Chemistry",
    exam: "BOTH",
    question: "Which element has the highest negative electron gain enthalpy in the periodic table?",
    options: [
      "Fluorine",
      "Chlorine",
      "Bromine",
      "Oxygen"
    ],
    correctIndex: 1,
    explanation: "Although Fluorine is more electronegative, it has a very compact 2p subshell with high inter-electronic repulsion. Due to this, Chlorine (which has larger 3p subshell) readily accepts an electron and has the highest negative electron gain enthalpy."
  },

  // --- MATHEMATICS (IOE ONLY) ---
  {
    id: "math_01",
    subject: "Mathematics",
    exam: "IOE",
    question: "What is the value of the limit as x approaches 0 of (1 - cos(x)) / x^2?",
    options: [
      "0",
      "1",
      "1/2",
      "Undefined"
    ],
    correctIndex: 2,
    explanation: "Apply L'Hopital's rule or use the trigonometric identity 1 - cos(x) = 2 sin^2(x/2). The limit reduces to lim [sin(x/2) / (x/2)]^2 * (1/2) = (1)^2 * 1/2 = 1/2."
  },
  {
    id: "math_02",
    subject: "Mathematics",
    exam: "IOE",
    question: "If A and B are two matrices such that AB = A and BA = B, then B^2 is equal to:",
    options: [
      "A",
      "B",
      "Identity Matrix I",
      "Zero Matrix O"
    ],
    correctIndex: 1,
    explanation: "Using properties of idempotent-type matrices: B^2 = B * B = (BA) * B = B * (AB) = B * A = B. Thus B^2 is equal to B."
  },
  {
    id: "math_03",
    subject: "Mathematics",
    exam: "IOE",
    question: "The equation of the tangent to the circle x^2 + y^2 = 25 at the point (3, 4) is:",
    options: [
      "3x + 4y = 25",
      "4x + 3y = 25",
      "3x - 4y = 25",
      "4x - 3y = 25"
    ],
    correctIndex: 0,
    explanation: "The equation of the tangent to the circle x^2 + y^2 = r^2 at point (x1, y1) is x*x1 + y*y1 = r^2. Substituting x1 = 3, y1 = 4, and r^2 = 25, we get 3x + 4y = 25."
  },
  {
    id: "math_04",
    subject: "Mathematics",
    exam: "IOE",
    question: "If the vector a = i - 2j + k and b = 4i - 4j + 7k, what is the projection of a on b?",
    options: [
      "5 / 9",
      "19 / 9",
      "19 / 3",
      "9 / 19"
    ],
    correctIndex: 1,
    explanation: "Projection of vector 'a' on 'b' is given by (a · b) / |b|. a · b = (1*4) + (-2*-4) + (1*7) = 4 + 8 + 7 = 19. |b| = sqrt(4^2 + (-4)^2 + 7^2) = sqrt(16 + 16 + 49) = sqrt(81) = 9. Thus the projection is 19 / 9."
  },
  {
    id: "math_05",
    subject: "Mathematics",
    exam: "IOE",
    question: "What is the general solution of the differential equation dy/dx = y / x?",
    options: [
      "y = x + C",
      "y = C * x",
      "y^2 = x^2 + C",
      "y = C / x"
    ],
    correctIndex: 1,
    explanation: "Separate variables: (1/y) dy = (1/x) dx. Integrating both sides: ln|y| = ln|x| + ln|C|. Taking exponents on both sides gives y = C * x."
  },

  // --- BIOLOGY (CEE ONLY: ZOOLOGY & BOTANY) ---
  {
    id: "bio_01",
    subject: "Biology",
    exam: "CEE",
    question: "Which chamber of the mammalian heart pumps oxygenated blood directly into the systemic aorta?",
    options: [
      "Right Atrium",
      "Right Ventricle",
      "Left Atrium",
      "Left Ventricle"
    ],
    correctIndex: 3,
    explanation: "The left ventricle receives oxygenated blood from the left atrium through the bicuspid (mitral) valve and pumps it with high force into the main systemic artery, the Aorta."
  },
  {
    id: "bio_02",
    subject: "Biology",
    exam: "CEE",
    question: "In double fertilisation in angiosperms, the triple fusion refers to the fusion of:",
    options: [
      "One male gamete with egg cell",
      "One male gamete with two polar nuclei",
      "Two male gametes with one synergid cell",
      "Three vegetative cell divisions"
    ],
    correctIndex: 1,
    explanation: "Triple fusion is the fusion of the second haploid male gamete (n) with the diploid secondary nucleus / two polar nuclei (2n) inside the embryo sac to form the triploid Primary Endosperm Nucleus (3n, PEN)."
  },
  {
    id: "bio_03",
    subject: "Biology",
    exam: "CEE",
    question: "During which phase of cells undergoing meiosis does crossing-over (homologous recombination) occur?",
    options: [
      "Zygotene of Prophase I",
      "Pachytene of Prophase I",
      "Diplotene of Prophase I",
      "Metaphase I"
    ],
    correctIndex: 1,
    explanation: "During Prophase I of Meiosis I, the matching chromatid strings align. Crossing over (exchange of genetic material between non-sister chromatids of homologous chromosomes) specifically takes place during the Pachytene substage."
  },
  {
    id: "bio_04",
    subject: "Biology",
    exam: "CEE",
    question: "Water in plants moves upward through vessels and tracheids. Which force is primarily responsible for holding the water column together without breaking?",
    options: [
      "Cohesive force",
      "Adhesive force",
      "Root pressure",
      "Osmotic suction"
    ],
    correctIndex: 0,
    explanation: "Cohesive force represents the mutual attraction between water molecules (hydrogen bonding), which creates colossal tensile strength inside the narrow xylem tubes, preventing the water string from snapping under heavy transpiration pull."
  },
  {
    id: "bio_05",
    subject: "Biology",
    exam: "CEE",
    question: "Which of the following hormones is highly responsible for the 'Triple Response' (inhibition of elongation, radial thickening, and horizontal growth) in plant seedlings?",
    options: [
      "Auxin",
      "Gibberellin",
      "Ethylene",
      "Abscisic Acid"
    ],
    correctIndex: 2,
    explanation: "Ethylene is a gaseous plant hormone. It triggers the classic 'triple response' in seedlings when they hit hard physical barriers (like soil crusts or stones), promoting radial growth and hook formation."
  }
];

export function getOfflineQuestions(exam: "IOE" | "CEE", subject?: string, topic?: string): RawQuestion[] {
  let list = LOCAL_QUESTION_BANK.filter((q) => q.exam === "BOTH" || q.exam === exam);
  
  if (subject && subject !== "All") {
    list = list.filter((q) => q.subject.toLowerCase() === subject.toLowerCase());
  }

  // Shuffle list to randomize
  return list.sort(() => 0.5 - Math.random());
}
