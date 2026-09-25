<script setup lang="ts">
import { Loader2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'maker' })

const { $api, $haptic } = useNuxtApp()
const { data: categories } = await useApiFetch<any[]>('/api/categories')

const form = reactive({
  title: '',
  description: '',
  categoryId: '' as string,
  price: undefined as number | undefined,
  compareAtPrice: undefined as number | undefined,
  stock: 0,
  isMadeToOrder: false,
  leadTimeDays: 14,
  minOrderQty: 1,
  materials: [] as string[],
  dimensions: '',
  weightGrams: undefined as number | undefined,
  images: [] as string[],
  status: 'draft' as 'draft' | 'published',
})

const materialDraft = ref('')
const imageDraft = ref('')
const submitting = ref(false)
const errors = ref<Record<string, string>>({})

function addMaterial() {
  const value = materialDraft.value.trim()
  if (value && !form.materials.includes(value)) form.materials.push(value)
  materialDraft.value = ''
}

function addImage() {
  const value = imageDraft.value.trim()
  if (value && form.images.length < 8) form.images.push(value)
  imageDraft.value = ''
}

async function save(status: 'draft' | 'published') {
  errors.value = {}
  form.status = status
  submitting.value = true

  try {
    await $api('/api/maker/products', {
      method: 'POST',
      body: {
        ...form,
        categoryId: form.categoryId || null,
        dimensions: form.dimensions || undefined,
        leadTimeDays: form.isMadeToOrder ? form.leadTimeDays : null,
      },
    })

    $haptic.success()
    toast.success(status === 'published' ? 'Listing is live.' : 'Draft saved.')
    await navigateTo('/maker/products')
  } catch (error: any) {
    const issues = error?.data?.data?.issues as { path: (string | number)[]; message: string }[] | undefined
    if (issues?.length) {
      for (const issue of issues) errors.value[String(issue.path.at(-1))] = issue.message
      toast.error('Check the highlighted fields.')
    } else {
      toast.error(apiErrorMessage(error, 'Could not save the listing.'))
    }
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: 'New listing · Likha Cebu' })
</script>

<template>
  <div class="lg:mx-auto lg:w-full lg:max-w-2xl">
    <AppHeader title="New listing" back="/maker/products" />

    <form class="space-y-5 p-4" @submit.prevent="save('published')">
      <div class="space-y-1">
        <Label for="title">What is it?</Label>
        <Input id="title" v-model="form.title" placeholder="Concert Classical Guitar in Jackfruit and Spruce" required />
        <p v-if="errors.title" class="text-xs text-destructive">{{ errors.title }}</p>
      </div>

      <div class="space-y-1">
        <Label for="description">Description</Label>
        <Textarea
          id="description"
          v-model="form.description"
          rows="6"
          placeholder="What it is made of, how long it takes, what makes it different from a factory one."
        />
        <p class="text-xs text-muted-foreground">
          Buyers pay for craft when they understand it. Say how it is made.
        </p>
      </div>

      <div class="space-y-1">
        <Label for="category">Craft</Label>
        <select
          id="category"
          v-model="form.categoryId"
          class="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Choose a craft</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <Separator />

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label for="price">Price (PHP)</Label>
          <Input id="price" v-model.number="form.price" type="number" inputmode="numeric" min="1" required />
          <p v-if="errors.price" class="text-xs text-destructive">{{ errors.price }}</p>
        </div>
        <div class="space-y-1">
          <Label for="compareAt">Was (optional)</Label>
          <Input id="compareAt" v-model.number="form.compareAtPrice" type="number" inputmode="numeric" min="0" />
        </div>
      </div>

      <label class="flex items-center justify-between rounded-md editorial-surface p-3">
        <span>
          <span class="block text-sm font-medium">Made to order</span>
          <span class="block text-xs leading-relaxed text-muted-foreground">
            You start it after someone buys. No stock limit, but you must commit to a lead time.
          </span>
        </span>
        <Switch v-model="form.isMadeToOrder" />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <div v-if="form.isMadeToOrder" class="space-y-1">
          <Label for="lead">Lead time (days)</Label>
          <Input id="lead" v-model.number="form.leadTimeDays" type="number" inputmode="numeric" min="1" max="365" />
          <p v-if="errors.leadTimeDays" class="text-xs text-destructive">{{ errors.leadTimeDays }}</p>
        </div>
        <div v-else class="space-y-1">
          <Label for="stock">Stock on hand</Label>
          <Input id="stock" v-model.number="form.stock" type="number" inputmode="numeric" min="0" />
          <p v-if="errors.stock" class="text-xs text-destructive">{{ errors.stock }}</p>
        </div>

        <div class="space-y-1">
          <Label for="minOrder">Minimum order</Label>
          <Input id="minOrder" v-model.number="form.minOrderQty" type="number" inputmode="numeric" min="1" />
          <p class="text-xs text-muted-foreground">Set above 1 for wholesale-only lots.</p>
        </div>
      </div>

      <Separator />

      <!-- Materials -->
      <div class="space-y-1">
        <Label for="material">Materials</Label>
        <div class="flex gap-2">
          <Input
            id="material"
            v-model="materialDraft"
            placeholder="Solid spruce top"
            @keydown.enter.prevent="addMaterial"
          />
          <Button type="button" variant="outline" @click="addMaterial">Add</Button>
        </div>
        <div v-if="form.materials.length" class="flex flex-wrap gap-1.5 pt-1.5">
          <span
            v-for="(material, index) in form.materials"
            :key="material"
            class="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
          >
            {{ material }}
            <button type="button" aria-label="Remove" @click="form.materials.splice(index, 1)">
              <X class="size-3" />
            </button>
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label for="dimensions">Size</Label>
          <Input id="dimensions" v-model="form.dimensions" placeholder="100 x 37 x 10 cm" />
        </div>
        <div class="space-y-1">
          <Label for="weight">Weight (grams)</Label>
          <Input id="weight" v-model.number="form.weightGrams" type="number" inputmode="numeric" min="0" />
        </div>
      </div>

      <Separator />

      <!-- Images -->
      <div class="space-y-1">
        <Label for="image">Photo URLs</Label>
        <div class="flex gap-2">
          <Input
            id="image"
            v-model="imageDraft"
            type="url"
            placeholder="https://…"
            @keydown.enter.prevent="addImage"
          />
          <Button type="button" variant="outline" @click="addImage">Add</Button>
        </div>
        <p class="text-xs text-muted-foreground">
          Paste image links for now. Wire up Cloudinary for direct uploads from the phone camera.
        </p>

        <div v-if="form.images.length" class="grid grid-cols-4 gap-2 pt-2">
          <div v-for="(image, index) in form.images" :key="image" class="relative">
            <img :src="image" alt="" class="aspect-square w-full rounded-lg object-cover" />
            <button
              type="button"
              class="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground"
              aria-label="Remove photo"
              @click="form.images.splice(index, 1)"
            >
              <X class="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-2 pb-4">
        <Button
          type="button"
          variant="outline"
          class="h-11 flex-1"
          :disabled="submitting"
          @click="save('draft')"
        >
          Save draft
        </Button>
        <Button type="submit" class="h-11 flex-1" :disabled="submitting">
          <Loader2 v-if="submitting" class="mr-2 size-4 animate-spin" />Publish
        </Button>
      </div>
    </form>
  </div>
</template>
