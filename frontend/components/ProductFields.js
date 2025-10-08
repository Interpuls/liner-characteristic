import { Box, Checkbox, Divider, FormControl, FormLabel, Image, Input, InputGroup, InputLeftAddon, SimpleGrid, Text, Textarea, Stack, HStack, Icon } from "@chakra-ui/react";
import FancySelect from "./ui/FancySelect";

// Shared fields for Product create/edit modals
// Props:
// - values: object with current field values
// - meta: { brands: string[], models: string[] }
// - onChange: (field, value) => void
// - onNumberChange: (field, value) => void
// - onVisibleChange: (visible: boolean) => void  // toggles only_admin upstream
// - techImageUrl?: string
export default function ProductFields({ values, meta, onChange, onNumberChange, onVisibleChange, techImageUrl }) {
  const v = values || {};
  const BARREL_SHAPES = ["Round", "Triangular", "Squared"];
  const AREAS = [
    "Global",
    "North America",
    "South America",
    "Europe",
    "Africa",
    "China",
    "Middle East",
    "Far East",
    "Oceania",
  ];

  const selectedAreas = Array.isArray(v.reference_areas) ? v.reference_areas : [];
  const hasGlobal = selectedAreas.includes("Global");

  const toggleArea = (area) => (e) => {
    const checked = e.target.checked;
    let next = selectedAreas.slice();
    if (area === "Global") {
      next = checked ? ["Global"] : [];
    } else {
      // if toggling a regional area, remove Global first
      next = next.filter((a) => a !== "Global");
      if (checked && !next.includes(area)) next.push(area);
      if (!checked) next = next.filter((a) => a !== area);
    }
    onChange("reference_areas", next.length ? next : null);
  };

  const RoundIcon = (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  );
  const TriangleIcon = (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <polygon points="12 4 20 18 4 18" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  );
  const SquareIcon = (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  );

  return (
    <>
      {/* Product details */}
      <Text fontSize="m" color="gray.600" mb={2} fontWeight="medium">Product details</Text>
      <SimpleGrid columns={{ base:1, md:3 }} gap={4} mb={6}>
        {/* Brand */}
        <FormControl isRequired mb={2}>
          <FormLabel fontSize="sm" color="gray.500">Brand</FormLabel>
          <Input
            list="brand-options"
            placeholder="Type or choose a brand"
            value={v.brand || ""}
            onChange={(e)=>onChange("brand", e.target.value)}
          />
          <datalist id="brand-options">
            {(meta?.brands || []).map((b) => <option key={b} value={b} />)}
          </datalist>
        </FormControl>

        {/* Model */}
        <FormControl isRequired mb={2}>
          <FormLabel fontSize="sm" color="gray.500">Model</FormLabel>
          <Input
            list="model-options"
            placeholder="Type or choose a model"
            value={v.model || ""}
            onChange={(e)=>onChange("model", e.target.value)}
          />
          <datalist id="model-options">
            {(meta?.models || []).map((m) => <option key={m} value={m} />)}
          </datalist>
        </FormControl>

        {/* Compound */}
        <FormControl isRequired mb={2}>
          <FormLabel fontSize="sm" color="gray.500">Compound</FormLabel>
          <Input
            value={v.compound || ""}
            onChange={(e)=>onChange("compound", e.target.value)}
            placeholder="STD / ..."
          />
        </FormControl>

        {/* Manufactured at */}
        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Manufactured at</FormLabel>
          <Input
            type="date"
            value={v.manufactured_at ?? ""}
            onChange={(e)=>onChange("manufactured_at", e.target.value)}
          />
        </FormControl>

        {/* Notes */}
        <FormControl gridColumn={{ base: "span 1", md: "span 2" }}>
          <FormLabel fontSize="sm" color="gray.500">Notes</FormLabel>
          <Textarea
            placeholder="Optional notes for testers"
            value={v.notes ?? ""}
            onChange={(e)=>onChange("notes", e.target.value)}
            rows={3}
          />
        </FormControl>

        {/* Visibility (inverse of only_admin) */}
        <FormControl gridColumn={{ base: "span 1", md: "span 2" }}>
          <Checkbox
            isChecked={!v.only_admin}
            onChange={(e)=>onVisibleChange(e.target.checked)}
          >
            Visible to users
          </Checkbox>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Only one public variant per Brand/Model.
          </Text>
        </FormControl>
      </SimpleGrid>

      <Divider my={2} mb={6}/>

      {/* Additional attributes */}
      <Text fontSize="m" color="gray.600" mb={2} fontWeight="medium">Additional</Text>
      <SimpleGrid columns={{ base:1, md:2 }} templateColumns={{ base: '1fr', md: '2fr 1fr' }} gap={6} mb={6} alignItems="start">
        {/* Left side: selects + three numeric fields in a nested grid */}
        <Box>
          <SimpleGrid columns={{ base:1, md:2 }} gap={4} mb={4}>
            {/* Parlour Type (maps to robot_liner) */}
            <FormControl>
              <FormLabel fontSize="sm" color="gray.500">Parlour Type</FormLabel>
              <FancySelect
                options={[
                  { value: "robot", label: "Robot" },
                  { value: "conventional", label: "Conventional Parlour" },
                ]}
                value={v.robot_liner ? "robot" : "conventional"}
                onChange={(val)=>onChange("robot_liner", val === "robot")}
                placeholder="Select parlour type"
                clearable={false}
              />
            </FormControl>
            {/* Barrel shape with outline icons */}
            <FormControl>
              <FormLabel fontSize="sm" color="gray.500">Barrel shape</FormLabel>
              <FancySelect
                options={[
                  { value: "round", label: <HStack spacing={2}><RoundIcon boxSize={3.5} /><span>Round</span></HStack> },
                  { value: "triangular", label: <HStack spacing={2}><TriangleIcon boxSize={3.5} /><span>Triangular</span></HStack> },
                  { value: "squared", label: <HStack spacing={2}><SquareIcon boxSize={3.5} /><span>Squared</span></HStack> },
                ]}
                value={v.barrel_shape || ""}
                onChange={(val)=>onChange("barrel_shape", val || null)}
                placeholder="Select barrel shape"
                clearable={false}
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base:1, md:3 }} gap={4}>
            {/* Shell Type */}
            <FormControl>
              <FormLabel fontSize="sm" color="gray.500">Shell type</FormLabel>
              <Input
                type="number"
                value={v.shell_type ?? ""}
                onChange={(e)=>onNumberChange("shell_type", e.target.value)}
                placeholder="Type shell type"
              />
            </FormControl>
            {/* Wash Cup */}
            <FormControl>
              <FormLabel fontSize="sm" color="gray.500">Wash cup</FormLabel>
              <Input
                type="number"
                value={v.wash_cup ?? ""}
                onChange={(e)=>onNumberChange("wash_cup", e.target.value)}
                placeholder="Type wash cup"
              />
            </FormControl>
            {/* Spider Wash Cup */}
            <FormControl>
              <FormLabel fontSize="sm" color="gray.500">Spider Wash Cup</FormLabel>
              <Input
                type="number"
                value={v.spider_wash_cup ?? ""}
                onChange={(e)=>onNumberChange("spider_wash_cup", e.target.value)}
                placeholder="Type spider wash cup"
              />
            </FormControl>
          </SimpleGrid>
        </Box>

        {/* Right side: Reference areas */}
        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Reference areas</FormLabel>
          <Stack spacing={1}>
            {AREAS.map((area) => (
              <Checkbox
                key={area}
                isChecked={selectedAreas.includes(area)}
                onChange={toggleArea(area)}
                isDisabled={area !== "Global" && hasGlobal}
              >
                {area}
              </Checkbox>
            ))}
          </Stack>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Select multiple areas or choose Global to include all.
          </Text>
        </FormControl>
      </SimpleGrid>

      <Divider my={2} mb={6}/>

      <Text fontSize="m" color="gray.600" mb={2} fontWeight="medium">Technical specifications</Text>
      <Box mb={4} display="flex" justifyContent="center">
        <Image
          src={techImageUrl || "/liner.png"}
          alt="Technical schema"
          maxH="220px"
          objectFit="contain"
          borderRadius="md"
          borderWidth="1px"
          p={2}
          bg="white"
          _dark={{ bg: "gray.800", borderColor: "gray.600" }}
        />
      </Box>

      <SimpleGrid columns={{ base:1, md:2 }} gap={4}>
        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Liner Length (mm)</FormLabel>
          <InputGroup size="md">
            <InputLeftAddon w="12" justifyContent="center" fontSize="sm" color="inherit" _dark={{ bg: "gray.700", borderColor: "gray.600" }}>A</InputLeftAddon>
            <Input type="number" value={v.liner_length ?? ""} onChange={(e)=>onNumberChange("liner_length", e.target.value)} />
          </InputGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Hoodcup diameter (mm)</FormLabel>
          <InputGroup size="md">
            <InputLeftAddon w="12" justifyContent="center" fontSize="sm" color="inherit" _dark={{ bg: "gray.700", borderColor: "gray.600" }}>B</InputLeftAddon>
            <Input type="number" value={v.hoodcup_diameter ?? ""} onChange={(e)=>onNumberChange("hoodcup_diameter", e.target.value)} />
          </InputGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Orifice diameter (mm)</FormLabel>
          <InputGroup size="md">
            <InputLeftAddon w="12" justifyContent="center" fontSize="sm" color="inherit" _dark={{ bg: "gray.700", borderColor: "gray.600" }}>C</InputLeftAddon>
            <Input type="number" value={v.orifice_diameter ?? ""} onChange={(e)=>onNumberChange("orifice_diameter", e.target.value)} />
          </InputGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Barrel diameter (mm)</FormLabel>
          <InputGroup size="md">
            <InputLeftAddon w="12" justifyContent="center" fontSize="sm" color="inherit" _dark={{ bg: "gray.700", borderColor: "gray.600" }}>D</InputLeftAddon>
            <Input type="number" value={v.barrel_diameter ?? ""} onChange={(e)=>onNumberChange("barrel_diameter", e.target.value)} />
          </InputGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Return to lockring (mm)</FormLabel>
          <InputGroup size="md">
            <InputLeftAddon w="12" justifyContent="center" fontSize="sm" color="inherit" _dark={{ bg: "gray.700", borderColor: "gray.600" }}>E</InputLeftAddon>
            <Input type="number" value={v.return_to_lockring ?? ""} onChange={(e)=>onNumberChange("return_to_lockring", e.target.value)} />
          </InputGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Lockring diameter (mm)</FormLabel>
          <InputGroup size="md">
            <InputLeftAddon w="12" justifyContent="center" fontSize="sm" color="inherit" _dark={{ bg: "gray.700", borderColor: "gray.600" }}>F</InputLeftAddon>
            <Input type="number" value={v.lockring_diameter ?? ""} onChange={(e)=>onNumberChange("lockring_diameter", e.target.value)} />
          </InputGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Milk tube ID (mm)</FormLabel>
          <InputGroup size="md">
            <InputLeftAddon w="12" justifyContent="center" fontSize="sm" color="inherit" _dark={{ bg: "gray.700", borderColor: "gray.600" }}>G</InputLeftAddon>
            <Input type="number" value={v.milk_tube_id ?? ""} onChange={(e)=>onNumberChange("milk_tube_id", e.target.value)} />
          </InputGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">MP depth (mm)</FormLabel>
          <Input type="number" value={v.mp_depth_mm ?? ""} onChange={(e)=>onNumberChange("mp_depth_mm", e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Shell orifice</FormLabel>
          <Input type="number" value={v.shell_orifice ?? ""} onChange={(e)=>onNumberChange("shell_orifice", e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Shell length</FormLabel>
          <Input type="number" value={v.shell_length ?? ""} onChange={(e)=>onNumberChange("shell_length", e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Shell External diameter</FormLabel>
          <Input type="number" value={v.shell_external_diameter ?? ""} onChange={(e)=>onNumberChange("shell_external_diameter", e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Overall length (mm)</FormLabel>
          <Input type="number" value={v.overall_length ?? ""} onChange={(e)=>onNumberChange("overall_length", e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Barrel wall thickness (mm)</FormLabel>
          <Input type="number" value={v.barrell_wall_thickness ?? ""} onChange={(e)=>onNumberChange("barrell_wall_thickness", e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Barrel conicity</FormLabel>
          <Input type="number" value={v.barrell_conicity ?? ""} onChange={(e)=>onNumberChange("barrell_conicity", e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="gray.500">Hardness</FormLabel>
          <Input type="number" value={v.hardness ?? ""} onChange={(e)=>onNumberChange("hardness", e.target.value)} />
        </FormControl>
      </SimpleGrid>
    </>
  );
}
