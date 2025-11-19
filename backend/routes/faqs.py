from fastapi import APIRouter, HTTPException
import json
from pathlib import Path

router = APIRouter(
    prefix="/faq",
    tags=["FAQ"]
)

# Absolute path based on this file
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
faq_file = BASE_DIR / "data" / "faqs.json"

def load_faq():
    try:
        with open(faq_file, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"File not found: {faq_file}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON error: {str(e)}")

@router.get("/", summary="Get all FAQs")
def get_faqs():
    return load_faq()

@router.get("/{id}", summary="Get FAQ by ID")
def get_faq(id: int):
    faqs = load_faq()
    for faq in faqs:
        if faq.get("id") == id:
            return faq
    raise HTTPException(status_code=404, detail=f"FAQ with id {id} not found.")

@router.delete("/{id}", summary="Delete FAQ by ID")
def delete_faq(id: int):
    faqs = load_faq()
    for i, faq in enumerate(faqs):
        if faq.get("id") == id:
            del faqs[i]
            with open(faq_file, "w", encoding="utf-8") as f:
                json.dump(faqs, f, indent=4)
            return {"message": f"FAQ {id} deleted."}
    raise HTTPException(status_code=404, detail=f"FAQ with id {id} not found.")

@router.put("/{id}", summary="Update FAQ by ID")
def update_faq(id: int, updated_faq: dict):
    faqs = load_faq()
    for i, faq in enumerate(faqs):
        if faq.get("id") == id:
            faqs[i].update(updated_faq)
            with open(faq_file, "w", encoding="utf-8") as f:
                json.dump(faqs, f, indent=4)
            return {"message": f"FAQ {id} updated."}
    raise HTTPException(status_code=404, detail=f"FAQ with id {id} not found.")
