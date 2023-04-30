from django.shortcuts import render,redirect
from django.contrib.auth.decorators import login_required
from .forms import UserRegisterForm
from django.contrib import messages

# Create your views here.
def register(request):
    if request.method=='POST':
        form=UserRegisterForm(request.POST)
        if form.is_valid():
            form.save()
            username=form.cleaned_data.get('username')
            messages.success(request,f'account created for {username}!')
            return redirect('login')

    else:
        form = UserRegisterForm()

    return render(request,'Users/register.html',{'form':form})

@login_required
def home(request):
    return render(request,'Users/base.html')