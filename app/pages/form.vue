<script setup lang="ts">
const currentStep = ref(1)
const totalSteps = 4

// Form data
const formData = ref({
  step1: {
    input1: '',
    input2: ''
  },
  step2: {
    radioOption: '',
    selectOption: '',
    textInput: ''
  },
  step3: {
    question: '',
    checkboxes: [] as string[],
    websiteLink: ''
  },
  step4: {
    selectOption: '',
    date: ''
  }
})

const steps = computed(() => [
  { number: 1, title: 'Step 1 title', completed: currentStep.value > 1 },
  { number: 2, title: 'Step 2 title', completed: currentStep.value > 2 },
  { number: 3, title: 'Step 3 title', completed: currentStep.value > 3 },
  { number: 4, title: 'Step 4 title', completed: currentStep.value > 4 }
])

const radioOptions = [
  { value: 'A', label: 'A', description: 'Answer' },
  { value: 'B', label: 'B', description: 'Answer' },
  { value: 'C', label: 'C', description: 'Answer' },
  { value: 'D', label: 'D', description: 'Answer' }
]

const selectOptions = [
  { value: '', label: 'Select one...' },
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' }
]

const checkboxOptions = [
  { value: 'A', label: 'Option A' },
  { value: 'B', label: 'Option B' },
  { value: 'C', label: 'Option C' },
  { value: 'D', label: 'Option D' },
  { value: 'E', label: 'Option E' },
  { value: 'F', label: 'Option F' }
]

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function handleCancel() {
  // Reset form or navigate away
  navigateTo('/')
}

function handleSubmit() {
  // Handle form submission
  console.log('Form submitted:', formData.value)
  // You can add your submission logic here
}
</script>

<template>
  <div>
    <div class="min-h-screen container mx-auto px-4 py-12 max-w-2xl">
      <!-- Logo placeholder -->
      <div class="flex justify-center mb-12">
        <div class="bg-gray-200 rounded-lg w-32 h-24 flex items-center justify-center">
          <UIcon name="i-lucide-image" class="w-12 h-12 text-gray-400" />
        </div>
      </div>

      <!-- Step Indicators -->
      <div class="flex items-center justify-center gap-4 mb-12">
        <div v-for="(step, index) in steps" :key="step.number" class="flex items-center">
          <div class="flex items-center gap-2">
            <div 
              class="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors"
              :class="[
                step.completed ? 'bg-black border-black text-white' : 
                currentStep === step.number ? 'border-black text-black' : 
                'border-gray-300 text-gray-400'
              ]"
            >
              <UIcon v-if="step.completed" name="i-lucide-check" class="w-4 h-4" />
              <span v-else class="text-sm font-medium">{{ step.number }}</span>
            </div>
            <span 
              class="text-xs font-medium hidden sm:inline"
              :class="currentStep >= step.number ? 'text-black' : 'text-gray-400'"
            >
              {{ step.title }}
            </span>
          </div>
          <div v-if="index < steps.length - 1" class="w-8 h-0.5 mx-2 bg-gray-300" />
        </div>
      </div>

      <!-- Form Content -->
      <div class="bg-white">
        <!-- Step 1 -->
        <div v-if="currentStep === 1" class="space-y-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-black mb-3">Lorem Ipsum</h2>
            <p class="text-sm text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.</p>
          </div>

          <div class="space-y-6">
            <UFormField label="Input">
              <UInput v-model="formData.step1.input1" size="lg" placeholder="" />
            </UFormField>

            <UFormField label="Input" required>
              <UInput 
                v-model="formData.step1.input2" 
                type="email" 
                size="lg" 
                placeholder="email@example.com"
                icon="i-lucide-mail"
              >
                <template #trailing>
                  <UIcon name="i-lucide-info" class="w-4 h-4 text-gray-400" />
                </template>
              </UInput>
            </UFormField>
          </div>

          <div class="flex justify-end gap-3">
            <UButton color="white" size="lg" @click="handleCancel">Cancel</UButton>
            <UButton color="black" size="lg" @click="nextStep">Next</UButton>
          </div>
        </div>

        <!-- Step 2 -->
        <div v-if="currentStep === 2" class="space-y-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-black mb-3">Lorem ipsum?</h2>
            <p class="text-sm text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.</p>
          </div>

          <div class="space-y-6">
            <UFormField label="Radio Button">
              <URadioGroup
                v-model="formData.step2.radioOption"
                :items="radioOptions"
                variant="table"
                color="neutral"
                size="lg"
                orientation="vertical"
              />
            </UFormField>

            <UFormField label="Select an option">
              <USelect 
                v-model="formData.step2.selectOption" 
                :options="selectOptions"
                option-attribute="label"
                value-attribute="value"
                size="lg"
              />
            </UFormField>

            <UFormField label="Input">
              <UInput v-model="formData.step2.textInput" size="lg" placeholder="" />
            </UFormField>
          </div>

          <div class="flex justify-end gap-3">
            <UButton color="white" size="lg" @click="previousStep">Back</UButton>
            <UButton color="black" size="lg" @click="nextStep">Next</UButton>
          </div>
        </div>

        <!-- Step 3 -->
        <div v-if="currentStep === 3" class="space-y-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-black mb-3">Lorem Ipsum</h2>
            <p class="text-sm text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.</p>
          </div>

          <div class="space-y-6">
            <UFormField label="Question?">
              <UInput v-model="formData.step3.question" size="lg" placeholder="" />
            </UFormField>

            <UFormField label="Checkbox">
              <UCheckboxGroup
                v-model="formData.step3.checkboxes"
                :items="checkboxOptions"
                variant="table"
                color="neutral"
                size="lg"
                orientation="horizontal"
                class="flex flex-wrap"
              />
            </UFormField>

            <UFormField label="Website link">
              <UInput v-model="formData.step3.websiteLink" size="lg" placeholder="" />
            </UFormField>
          </div>

          <div class="flex justify-end gap-3">
            <UButton color="white" size="lg" @click="previousStep">Back</UButton>
            <UButton color="black" size="lg" @click="nextStep">Next</UButton>
          </div>
        </div>

        <!-- Step 4 -->
        <div v-if="currentStep === 4" class="space-y-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-black mb-3">Lorem Ipsum</h2>
            <p class="text-sm text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.</p>
          </div>

          <div class="space-y-6">
            <UFormField label="Select an option">
              <USelect 
                v-model="formData.step4.selectOption" 
                :options="selectOptions"
                option-attribute="label"
                value-attribute="value"
                size="lg"
              />
            </UFormField>

            <UFormField label="Date">
              <UInput 
                v-model="formData.step4.date" 
                type="date"
                size="lg"
                icon="i-lucide-calendar"
                placeholder="dd/mm/yy"
              />
            </UFormField>
          </div>

          <div class="flex justify-end gap-3">
            <UButton color="white" size="lg" @click="previousStep">Back</UButton>
            <UButton color="black" size="lg" @click="handleSubmit">Pay</UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <Footer />
  </div>
</template>

