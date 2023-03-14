package recursive_protected_type is
  type myType is protected
  end protected;
end package;

package body recursive_protected_type is
  type myType is protected body
    type rec is record
      child: integer;
    end record;

    function fu return rec is
      variable myRec: rec;
    begin
      myRec.child := 1;
      return myRec;
    end function;

    procedure proc is
      variable var: integer;
      variable myRec: rec;
    begin
      var := myRec.child;
      myRec.child := fu.child + var;
    end procedure;

  end protected body;
end package body;