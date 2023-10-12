package hidden is

  type protected_type is protected
    impure function NewID(name : integer) return integer;
  end protected;

  shared variable protected_variable : protected_type;

  impure function NewID(name : integer) return integer;
end package;

package body hidden is

  impure function NewID (name : integer) return integer is
  begin
    return protected_variable.NewID(name);
  end function NewID;

  type protected_type is protected body
    impure function NewID(name : integer) return integer is
    begin
      return name;
    end function;
  end protected body;

end package body;
