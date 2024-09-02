//NOTE: Add and export any other constants related with presentation layer

const VALID_IMAGE_TYPES: { extensions: string[]; fileType: string }[] = [
  {
    extensions: ['jpg', 'jpeg'],
    fileType: 'image/jpeg',
  },
  {
    extensions: ['png'],
    fileType: 'image/png',
  },
  {
    extensions: ['gif'],
    fileType: 'image/gif',
  },
  {
    extensions: ['webp'],
    fileType: 'image/webp',
  },
]

export { VALID_IMAGE_TYPES }
